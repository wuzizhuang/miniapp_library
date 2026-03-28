package com.example.library.controller;

import com.example.library.dto.AuthorDto;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.AuthorService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
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

@WebMvcTest(AuthorController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
public class AuthorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AuthorService authorService;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    private AuthorDto authorDto;
    private Page<AuthorDto> authorPage;

    @TestConfiguration
    static class AuthorServiceTestConfig {
        @Bean
        public AuthorService authorService() {
            return Mockito.mock(AuthorService.class);
        }
    }

    @BeforeEach
    void setUp() {
        Mockito.reset(authorService);
        authorDto = new AuthorDto();
        authorDto.setAuthorId(1);
        authorDto.setName("鲁迅");
        authorDto.setBiography("著名作家");
        authorDto.setBirthYear(1881);
        authorDto.setDeathYear(1936);

        authorPage = new PageImpl<>(
                List.of(authorDto),
                PageRequest.of(0, 10, Sort.by(Sort.Direction.ASC, "name")),
                1);
    }

    @Test
    @WithMockUser
    void testGetAuthorById_Success() throws Exception {
        when(authorService.getAuthorById(1)).thenReturn(authorDto);

        mockMvc.perform(get("/api/authors/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authorId", is(1)))
                .andExpect(jsonPath("$.name", is("鲁迅")));

        verify(authorService).getAuthorById(1);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testCreateAuthor_AdminSuccess() throws Exception {
        when(authorService.createAuthor(any(AuthorDto.class))).thenReturn(authorDto);

        mockMvc.perform(post("/api/authors")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(authorDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.authorId", is(1)))
                .andExpect(jsonPath("$.name", is("鲁迅")));

        verify(authorService).createAuthor(any(AuthorDto.class));
    }

    @Test
    void testCreateAuthor_Unauthorized() throws Exception {
        mockMvc.perform(post("/api/authors")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(authorDto)))
                .andExpect(status().isUnauthorized());

        verify(authorService, never()).createAuthor(any(AuthorDto.class));
    }

    @Test
    @WithMockUser(roles = "USER")
    void testCreateAuthor_ForbiddenForNonAdmin() throws Exception {
        mockMvc.perform(post("/api/authors")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(authorDto)))
                .andExpect(status().isForbidden());

        verify(authorService, never()).createAuthor(any(AuthorDto.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testUpdateAuthor_AdminSuccess() throws Exception {
        AuthorDto updated = new AuthorDto();
        updated.setAuthorId(1);
        updated.setName("周树人");
        updated.setBiography("更新后的简介");
        updated.setBirthYear(1881);
        updated.setDeathYear(1936);

        when(authorService.updateAuthor(eq(1), any(AuthorDto.class))).thenReturn(updated);

        mockMvc.perform(put("/api/authors/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("周树人")))
                .andExpect(jsonPath("$.biography", is("更新后的简介")));

        verify(authorService).updateAuthor(eq(1), any(AuthorDto.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testDeleteAuthor_AdminSuccess() throws Exception {
        mockMvc.perform(delete("/api/authors/1"))
                .andExpect(status().isNoContent());

        verify(authorService).deleteAuthor(1);
    }

    @Test
    @WithMockUser
    void testGetAllAuthors_Success() throws Exception {
        Pageable expectedPageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.ASC, "name"));
        when(authorService.getAllAuthors(eq(expectedPageable))).thenReturn(authorPage);

        mockMvc.perform(get("/api/authors"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].name", is("鲁迅")))
                .andExpect(jsonPath("$.pageable.pageNumber", is(0)))
                .andExpect(jsonPath("$.pageable.pageSize", is(10)))
                .andExpect(jsonPath("$.pageable.sort.sorted", is(true)))
                .andExpect(jsonPath("$.sort.sorted", is(true)));

        verify(authorService).getAllAuthors(eq(expectedPageable));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testSearchAuthorsByName_AdminSuccess() throws Exception {
        Pageable pageable = PageRequest.of(0, 10);
        when(authorService.searchAuthorsByName(eq("鲁"), eq(pageable))).thenReturn(authorPage);

        mockMvc.perform(get("/api/authors/search")
                .param("name", "鲁"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].authorId", is(1)));

        verify(authorService).searchAuthorsByName(eq("鲁"), eq(pageable));
    }

    @Test
    @WithMockUser(roles = "USER")
    void testSearchAuthorsByName_UserSuccess() throws Exception {
        Pageable pageable = PageRequest.of(0, 10);
        when(authorService.searchAuthorsByName(eq("鲁"), eq(pageable))).thenReturn(authorPage);

        mockMvc.perform(get("/api/authors/search")
                .param("name", "鲁"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].authorId", is(1)));

        verify(authorService).searchAuthorsByName(eq("鲁"), eq(pageable));
    }

    @Test
    void testSearchAuthorsByName_PublicSuccess() throws Exception {
        Pageable pageable = PageRequest.of(0, 10);
        when(authorService.searchAuthorsByName(eq("鲁"), eq(pageable))).thenReturn(authorPage);

        mockMvc.perform(get("/api/authors/search")
                .param("name", "鲁"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].authorId", is(1)));

        verify(authorService).searchAuthorsByName(eq("鲁"), eq(pageable));
    }
}
