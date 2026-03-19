package com.example.library.controller;

import com.example.library.dto.admin.AdminAiGatewaySettingsDto;
import com.example.library.dto.admin.AdminAiGatewaySettingsUpdateDto;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.AiGatewaySettingsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminAiGatewayController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
class AdminAiGatewayControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AiGatewaySettingsService aiGatewaySettingsService;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @TestConfiguration
    static class Config {
        @Bean
        public AiGatewaySettingsService aiGatewaySettingsService() {
            return Mockito.mock(AiGatewaySettingsService.class);
        }
    }

    @BeforeEach
    void setUp() {
        Mockito.reset(aiGatewaySettingsService);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldGetAiGatewaySettings() throws Exception {
        when(aiGatewaySettingsService.getAdminSettings()).thenReturn(AdminAiGatewaySettingsDto.builder()
                .enabled(true)
                .provider("openai")
                .baseUrl("http://47.242.209.120:40005/v1")
                .model("gpt-4.1-mini")
                .hasApiKey(true)
                .apiKeyMasked("sk-...H8BJ")
                .build());

        mockMvc.perform(get("/api/admin/ai-gateway"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.baseUrl").value("http://47.242.209.120:40005/v1"))
                .andExpect(jsonPath("$.hasApiKey").value(true));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void shouldUpdateAiGatewaySettings() throws Exception {
        AdminAiGatewaySettingsUpdateDto request = new AdminAiGatewaySettingsUpdateDto();
        request.setEnabled(true);
        request.setProvider("openai");
        request.setBaseUrl("http://47.242.209.120:40005/v1");
        request.setModel("gpt-4.1-mini");
        request.setApiKey("new-secret");

        when(aiGatewaySettingsService.updateSettings(any(AdminAiGatewaySettingsUpdateDto.class), eq("user")))
                .thenReturn(AdminAiGatewaySettingsDto.builder()
                        .enabled(true)
                        .provider("openai")
                        .baseUrl("http://47.242.209.120:40005/v1")
                        .model("gpt-4.1-mini")
                        .hasApiKey(true)
                        .apiKeyMasked("sk-...H8BJ")
                        .updatedBy("user")
                        .build());

        mockMvc.perform(put("/api/admin/ai-gateway")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updatedBy").value("user"))
                .andExpect(jsonPath("$.apiKeyMasked").value("sk-...H8BJ"));
    }
}
