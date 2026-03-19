package com.example.library.service.impl;

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

/**
 * OpenAI-backed AI chat proxy using the official Responses API.
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
    public PublicAiChatResponseDto chat(String message, String previousResponseId) {
        AiGatewaySettingsService.EffectiveAiGatewaySettings settings = aiGatewaySettingsService.getEffectiveSettings();
        if (!settings.enabled() || settings.apiKey().isBlank()) {
            throw new ServiceUnavailableException("AI 助手当前未启用，请先在后台设置里配置 AI 网关地址和 API Key。");
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(stripTrailingSlash(settings.baseUrl()) + "/responses"))
                    .timeout(Duration.ofSeconds(45))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + settings.apiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(buildRequestBody(message, previousResponseId, settings.model())))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < HttpStatus.OK.value() || response.statusCode() >= HttpStatus.MULTIPLE_CHOICES.value()) {
                log.warn("OpenAI chat upstream failed with status {}: {}", response.statusCode(), safeSnippet(response.body()));
                throw new ServiceUnavailableException(resolveUpstreamMessage(response));
            }

            JsonNode payload = objectMapper.readTree(response.body());
            String reply = extractReply(payload);
            if (reply.isBlank()) {
                log.warn("OpenAI chat returned no text output: {}", safeSnippet(response.body()));
                throw new ServiceUnavailableException("AI 助手暂时没有返回有效内容，请稍后重试。");
            }

            return PublicAiChatResponseDto.builder()
                    .reply(reply)
                    .responseId(payload.path("id").asText(null))
                    .provider(settings.provider())
                    .model(settings.model())
                    .build();
        } catch (IOException ex) {
            log.warn("Failed to call OpenAI chat API: {}", ex.getMessage());
            throw new ServiceUnavailableException("AI 助手暂时不可用，请稍后重试。");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.warn("OpenAI chat request interrupted: {}", ex.getMessage());
            throw new ServiceUnavailableException("AI 助手请求被中断，请稍后重试。");
        }
    }

    private String buildRequestBody(String message, String previousResponseId, String model) throws IOException {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("model", model);
        payload.put("instructions", systemPrompt);
        payload.put("max_output_tokens", maxOutputTokens);

        if (previousResponseId != null && !previousResponseId.isBlank()) {
            payload.put("previous_response_id", previousResponseId.trim());
        }

        ArrayNode input = payload.putArray("input");
        ObjectNode messageNode = input.addObject();
        messageNode.put("role", "user");
        ArrayNode content = messageNode.putArray("content");
        ObjectNode textNode = content.addObject();
        textNode.put("type", "input_text");
        textNode.put("text", message.trim());

        return objectMapper.writeValueAsString(payload);
    }

    private String extractReply(JsonNode payload) {
        StringBuilder builder = new StringBuilder();
        JsonNode output = payload.path("output");

        if (output.isArray()) {
            for (JsonNode outputItem : output) {
                JsonNode content = outputItem.path("content");
                if (!content.isArray()) {
                    continue;
                }

                for (JsonNode contentItem : content) {
                    String type = contentItem.path("type").asText("");
                    if ("output_text".equals(type)) {
                        appendLine(builder, contentItem.path("text").asText(""));
                        continue;
                    }

                    if ("text".equals(type)) {
                        appendLine(builder, contentItem.path("value").asText(""));
                    }
                }
            }
        }

        if (builder.length() == 0) {
            appendLine(builder, payload.path("output_text").asText(""));
        }

        return builder.toString().trim();
    }

    private void appendLine(StringBuilder builder, String text) {
        if (text == null || text.isBlank()) {
            return;
        }

        if (builder.length() > 0) {
            builder.append('\n');
        }
        builder.append(text.trim());
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
