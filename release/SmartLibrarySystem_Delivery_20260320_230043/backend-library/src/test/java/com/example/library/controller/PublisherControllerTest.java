package com.example.library.controller;

import com.example.library.dto.PublisherDto;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.PublisherService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * WebMvc test for {@link PublisherController}.
 */
@WebMvcTest(PublisherController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
public class PublisherControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PublisherService publisherService;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @TestConfiguration
    static class Config {
        @Bean
        public PublisherService publisherService() {
            return Mockito.mock(PublisherService.class);
        }
    }

    private PublisherDto publisherDto;

    @BeforeEach
    void setUp() {
        Mockito.reset(publisherService);
        publisherDto = new PublisherDto();
        publisherDto.setPublisherId(1);
        publisherDto.setName("人民出版社");
    }

    @Test
    @WithMockUser
    void testGetAllPublishers_Success() throws Exception {
        when(publisherService.getAllPublishers(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(publisherDto)));

        mockMvc.perform(get("/api/publishers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("人民出版社"));
    }

    @Test
    @WithMockUser
    void testGetPublisherById_Success() throws Exception {
        when(publisherService.getPublisherById(1)).thenReturn(publisherDto);

        mockMvc.perform(get("/api/publishers/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publisherId").value(1))
                .andExpect(jsonPath("$.name").value("人民出版社"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testCreatePublisher_AdminSuccess() throws Exception {
        when(publisherService.createPublisher(any(PublisherDto.class))).thenReturn(publisherDto);

        mockMvc.perform(post("/api/publishers")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(publisherDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("人民出版社"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void testCreatePublisher_ForbiddenForNonAdmin() throws Exception {
        mockMvc.perform(post("/api/publishers")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(publisherDto)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testUpdatePublisher_AdminSuccess() throws Exception {
        PublisherDto updated = new PublisherDto();
        updated.setPublisherId(1);
        updated.setName("商务印书馆");
        when(publisherService.updatePublisher(eq(1), any(PublisherDto.class))).thenReturn(updated);

        mockMvc.perform(put("/api/publishers/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("商务印书馆"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testDeletePublisher_AdminSuccess() throws Exception {
        mockMvc.perform(delete("/api/publishers/1"))
                .andExpect(status().isNoContent());

        verify(publisherService).deletePublisher(1);
    }

    @Test
    @WithMockUser(roles = "USER")
    void testDeletePublisher_ForbiddenForNonAdmin() throws Exception {
        mockMvc.perform(delete("/api/publishers/1"))
                .andExpect(status().isForbidden());

        verify(publisherService, never()).deletePublisher(any());
    }
}
