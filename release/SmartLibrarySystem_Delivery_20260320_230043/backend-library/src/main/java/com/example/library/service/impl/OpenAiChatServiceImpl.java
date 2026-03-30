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
 * OpenAI 兼容聊天服务实现。
 * 通过标准 Chat Completions 接口把前端会话转发到配置好的 AI 网关。
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
        // 即使前端入口可见，只要后台未真正配置好网关，这里仍然要兜底拒绝请求。
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
     * 构建标准 Chat Completions 请求体。
     * 始终插入系统提示词，并只接受前端传来的 user/assistant 消息。
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

        // 系统提示词放在最前，统一限定回答风格与事实边界。
        ObjectNode systemNode = messagesArray.addObject();
        systemNode.put("role", "system");
        systemNode.put("content", systemPrompt);

        // 客户端只允许补充 user / assistant 消息，避免覆盖系统指令。
        for (PublicAiChatRequestDto.ChatMessageItem item : messages) {
            String role = item.getRole();
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
     * 从标准 Chat Completions 响应里提取首条回复文本。
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

    /**
     * 尝试把上游错误转换成更友好的前端提示文案。
     */
    private String resolveUpstreamMessage(HttpResponse<String> response) {
        try {
            JsonNode payload = objectMapper.readTree(response.body());
            String message = payload.path("error").path("message").asText("");
            if (!message.isBlank()) {
                return "AI 助手暂时不可用: " + message;
            }
        } catch (IOException ignored) {
            // 上游报错体格式异常时，回退到统一错误提示。
        }

        return "AI 助手暂时不可用，请稍后重试。";
    }

    /**
     * 截断日志中的上游响应体，避免异常情况下刷出过长内容。
     */
    private String safeSnippet(String body) {
        if (body == null || body.isBlank()) {
            return "";
        }

        return body.length() <= 300 ? body : body.substring(0, 300);
    }

    /**
     * 标准化基础地址，避免拼接接口路径时出现双斜杠。
     */
    private String stripTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "https://api.openai.com/v1";
        }

        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
