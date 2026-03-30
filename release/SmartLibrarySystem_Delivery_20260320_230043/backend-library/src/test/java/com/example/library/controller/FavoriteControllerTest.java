package com.example.library.controller;

import com.example.library.dto.book.BookDetailDto;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsImpl;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.FavoriteService;
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
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * WebMvc test for {@link FavoriteController}.
 */
@WebMvcTest(FavoriteController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
public class FavoriteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FavoriteService favoriteService;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @TestConfiguration
    static class Config {
        @Bean
        public FavoriteService favoriteService() {
            return Mockito.mock(FavoriteService.class);
        }
    }

    private UserDetailsImpl mockUser;

    @BeforeEach
    void setUp() {
        Mockito.reset(favoriteService);
        mockUser = new UserDetailsImpl(1, "testuser", "test@example.com", "hashed",
                "Test User", List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @Test
    void testGetMyFavorites_Success() throws Exception {
        BookDetailDto book = new BookDetailDto();
        book.setBookId(10);
        book.setTitle("Spring 实战");
        when(favoriteService.getUserFavorites(1L, 0, 10))
                .thenReturn(new PageImpl<>(List.of(book)));

        mockMvc.perform(get("/api/user-favorites").with(user(mockUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Spring 实战"));
    }

    @Test
    void testAddFavorite_Success() throws Exception {
        mockMvc.perform(post("/api/user-favorites/10").with(user(mockUser)))
                .andExpect(status().isCreated());

        verify(favoriteService).addFavorite(1L, 10);
    }

    @Test
    void testRemoveFavorite_Success() throws Exception {
        mockMvc.perform(delete("/api/user-favorites/10").with(user(mockUser)))
                .andExpect(status().isNoContent());

        verify(favoriteService).removeFavorite(1L, 10);
    }

    @Test
    void testCheckFavorite_ReturnsTrue() throws Exception {
        when(favoriteService.isFavorite(1L, 10)).thenReturn(true);

        mockMvc.perform(get("/api/user-favorites/10/check").with(user(mockUser)))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    void testGetMyFavorites_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/user-favorites"))
                .andExpect(status().isUnauthorized());
    }
}
