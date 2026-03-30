package com.example.library.controller;

import com.example.library.dto.CategoryDto;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.CategoryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CategoryController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
public class CategoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CategoryService categoryService;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    private CategoryDto categoryDto;

    @TestConfiguration
    static class CategoryServiceTestConfig {
        @Bean
        public CategoryService categoryService() {
            return Mockito.mock(CategoryService.class);
        }
    }

    @BeforeEach
    void setUp() {
        Mockito.reset(categoryService);
        categoryDto = new CategoryDto();
        categoryDto.setCategoryId(1);
        categoryDto.setName("文学");
        categoryDto.setParentId(null);
        categoryDto.setParentName(null);
        categoryDto.setDescription("文学类图书");
    }

    @Test
    @WithMockUser  
    void testGetAllCategories_Success() throws Exception {
        when(categoryService.getAllCategories(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(categoryDto)));

        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].name", is("文学")));

        verify(categoryService).getAllCategories(any(Pageable.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testCreateCategory_AdminSuccess() throws Exception {
        when(categoryService.createCategory(any(CategoryDto.class))).thenReturn(categoryDto);

        mockMvc.perform(post("/api/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(categoryDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.categoryId", is(1)))
                .andExpect(jsonPath("$.name", is("文学")));

        verify(categoryService).createCategory(any(CategoryDto.class));
    }

    @Test
    void testCreateCategory_Unauthorized() throws Exception {
        mockMvc.perform(post("/api/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(categoryDto)))
                .andExpect(status().isUnauthorized());

        verify(categoryService, never()).createCategory(any(CategoryDto.class));
    }

    @Test
    @WithMockUser(roles = "USER")
    void testCreateCategory_ForbiddenForNonAdmin() throws Exception {
        mockMvc.perform(post("/api/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(categoryDto)))
                .andExpect(status().isForbidden());

        verify(categoryService, never()).createCategory(any(CategoryDto.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testUpdateCategory_AdminSuccess() throws Exception {
        CategoryDto updated = new CategoryDto();
        updated.setCategoryId(1);
        updated.setName("现代文学");
        updated.setDescription("更新后的描述");

        when(categoryService.updateCategory(eq(1), any(CategoryDto.class))).thenReturn(updated);

        mockMvc.perform(put("/api/categories/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("现代文学")))
                .andExpect(jsonPath("$.description", is("更新后的描述")));

        verify(categoryService).updateCategory(eq(1), any(CategoryDto.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testDeleteCategory_AdminSuccess() throws Exception {
        mockMvc.perform(delete("/api/categories/1"))
                .andExpect(status().isNoContent());

        verify(categoryService).deleteCategory(1);
    }
}
