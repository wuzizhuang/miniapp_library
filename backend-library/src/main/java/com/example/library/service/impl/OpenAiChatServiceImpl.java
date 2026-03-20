package com.example.library.service.impl;

import com.example.library.dto.publicapi.PublicAiChatRequestDto;
import com.example.library.dto.publicapi.PublicAiChatResponseDto;
import com.example.library.exception.ServiceUnavailableException;
import com.example.library.service.AiGatewaySettingsService;
import com.example.library.service.AiChatService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

/**
 * AI chat proxy using the standard OpenAI Chat Completions API,
 * compatible with one-api and other OpenAI-compatible gateways.
 */
@Service
@Slf4j
public class OpenAiChatServiceImpl implements AiChatService {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final AiGatewaySettingsService aiGatewaySettingsService;
    private final String systemPrompt;
    private final int maxOutputTokens;

    public OpenAiChatServiceImpl(
            ObjectMapper objectMapper,
            AiGatewaySettingsService aiGatewaySettingsService,
            @Value("${app.ai.openai.max-output-tokens:700}") int maxOutputTokens,
            @Value("${app.ai.openai.system-prompt:你是高校图书馆的 AI 助手。请用简洁、专业、友好的中文回答。你可以帮助用户进行图书推荐、借阅与预约规则说明、馆内服务指引和学习建议。对于实时馆藏数量、具体副本状态、罚款金额、账号数据等无法确认的事实，不要编造，应明确提醒用户去馆藏目录、个人中心或咨询馆员进行核实。}") String systemPrompt) {
        this.objectMapper = objectMapper;
        this.aiGatewaySettingsService = aiGatewaySettingsService;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();
        this.maxOutputTokens = maxOutputTokens;
        this.systemPrompt = systemPrompt;
    }

    @Override
    public PublicAiChatResponseDto chat(List<PublicAiChatRequestDto.ChatMessageItem> messages) {
        AiGatewaySettingsService.EffectiveAiGatewaySettings settings = aiGatewaySettingsService.getEffectiveSettings();
        if (!settings.enabled() || settings.apiKey().isBlank()) {
            throw new ServiceUnavailableException("AI 助手当前未启用，请先在后台设置里配置 AI 网关地址和 API Key。");
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(stripTrailingSlash(settings.baseUrl()) + "/chat/completions"))
                    .timeout(Duration.ofSeconds(45))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + settings.apiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(buildRequestBody(messages, settings.model())))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < HttpStatus.OK.value() || response.statusCode() >= HttpStatus.MULTIPLE_CHOICES.value()) {
                log.warn("AI chat upstream failed with status {}: {}", response.statusCode(), safeSnippet(response.body()));
                throw new ServiceUnavailableException(resolveUpstreamMessage(response));
            }

            JsonNode payload = objectMapper.readTree(response.body());
            String reply = extractReply(payload);
            if (reply.isBlank()) {
                log.warn("AI chat returned no text output: {}", safeSnippet(response.body()));
                throw new ServiceUnavailableException("AI 助手暂时没有返回有效内容，请稍后重试。");
            }

            return PublicAiChatResponseDto.builder()
                    .reply(reply)
                    .provider(settings.provider())
                    .model(settings.model())
                    .build();
        } catch (IOException ex) {
            log.warn("Failed to call AI chat API: {}", ex.getMessage());
            throw new ServiceUnavailableException("AI 助手暂时不可用，请稍后重试。");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.warn("AI chat request interrupted: {}", ex.getMessage());
            throw new ServiceUnavailableException("AI 助手请求被中断，请稍后重试。");
        }
    }

    /**
     * Builds a standard Chat Completions API request body.
     * <pre>
     * {
     *   "model": "gpt-4.1-mini",
     *   "max_tokens": 700,
     *   "messages": [
     *     {"role": "system", "content": "..."},
     *     {"role": "user", "content": "..."},
     *     {"role": "assistant", "content": "..."},
     *     ...
     *   ]
     * }
     * </pre>
     */
    private String buildRequestBody(List<PublicAiChatRequestDto.ChatMessageItem> messages, String model) throws IOException {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("model", model);
        payload.put("max_tokens", maxOutputTokens);

        ArrayNode messagesArray = payload.putArray("messages");

        // Always prepend the system prompt
        ObjectNode systemNode = messagesArray.addObject();
        systemNode.put("role", "system");
        systemNode.put("content", systemPrompt);

        // Append conversation history from the client
        for (PublicAiChatRequestDto.ChatMessageItem item : messages) {
            String role = item.getRole();
            // Only allow user and assistant roles from the client
            if (!"user".equals(role) && !"assistant".equals(role)) {
                continue;
            }
            ObjectNode messageNode = messagesArray.addObject();
            messageNode.put("role", role);
            messageNode.put("content", item.getContent().trim());
        }

        return objectMapper.writeValueAsString(payload);
    }

    /**
     * Extracts the reply text from a standard Chat Completions response.
     * Expected format: { "choices": [{ "message": { "content": "..." } }] }
     */
    private String extractReply(JsonNode payload) {
        JsonNode choices = payload.path("choices");
        if (choices.isArray() && !choices.isEmpty()) {
            JsonNode firstChoice = choices.get(0);
            String content = firstChoice.path("message").path("content").asText("");
            if (!content.isBlank()) {
                return content.trim();
            }
        }
        return "";
    }

    private String resolveUpstreamMessage(HttpResponse<String> response) {
        try {
            JsonNode payload = objectMapper.readTree(response.body());
            String message = payload.path("error").path("message").asText("");
            if (!message.isBlank()) {
                return "AI 助手暂时不可用: " + message;
            }
        } catch (IOException ignored) {
            // Ignore malformed upstream error payload.
        }

        return "AI 助手暂时不可用，请稍后重试。";
    }

    private String safeSnippet(String body) {
        if (body == null || body.isBlank()) {
            return "";
        }

        return body.length() <= 300 ? body : body.substring(0, 300);
    }

    private String stripTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "https://api.openai.com/v1";
        }

        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
