package com.example.library.controller;

import com.example.library.dto.book.BookCopyDto;
import com.example.library.dto.book.BookCreateDto;
import com.example.library.dto.book.BookDetailDto;
import com.example.library.dto.book.BookLocationMapDto;
import com.example.library.dto.book.BookUpdateDto;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.BookAuthorService;
import com.example.library.service.BookCopyService;
import com.example.library.service.BookLocationMapService;
import com.example.library.service.BookService;
import com.example.library.service.ReviewService;
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
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BookController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
public class BookControllerTest {

    @Autowired
    private MockMvc mockMvc; // 用于模拟 HTTP 请求

    @Autowired
    private ObjectMapper objectMapper; // 用于将 Java 对象转成 JSON 字符串

    @Autowired
    private BookService bookService; // 用于将java对象模拟为Bean

    @Autowired
    private BookAuthorService bookAuthorService;

    @Autowired
    private BookCopyService bookCopyService;

    @Autowired
    private BookLocationMapService bookLocationMapService;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    // ... (其他 Mock Bean 配置保持不变) ...
    @TestConfiguration
    static class BookServiceTestConfig {
        @Bean
        public BookService bookService() {
            return Mockito.mock(BookService.class);
        }

        @Bean
        public BookAuthorService bookAuthorService() {
            return Mockito.mock(BookAuthorService.class);
        }

        @Bean
        public BookCopyService bookCopyService() {
            return Mockito.mock(BookCopyService.class);
        }

        @Bean
        public BookLocationMapService bookLocationMapService() {
            return Mockito.mock(BookLocationMapService.class);
        }

        @Bean
        public ReviewService reviewService() {
            return Mockito.mock(ReviewService.class);
        }
    }

    // ... (剩下的测试代码保持不变) ...

    // 为了演示完整性，这里放一个 setUp 和 test
    private Page<BookDetailDto> bookPage;
    private BookDetailDto testBookDto;
    private Page<BookDetailDto> testBookPage;

    @BeforeEach
    void setUp() {
        Mockito.reset(bookService, bookAuthorService, bookCopyService, bookLocationMapService);
        testBookDto = new BookDetailDto();
        testBookDto.setBookId(1);
        testBookDto.setTitle("Spring Boot 实战");
        testBookDto.setIsbn("978-1234567890");

        testBookPage = new PageImpl<>(Collections.singletonList(testBookDto));
    }

    @Test
    @WithMockUser
    void testGetAllBooks() throws Exception {
        when(bookService.getAllBooks(anyInt(), anyInt(), anyString(), anyString()))
                .thenReturn(testBookPage);
        mockMvc.perform(get("/api/books")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk()) // 验证状态码 200
                .andExpect(jsonPath("$.content[0].title").value("Spring Boot 实战")); // 验证数据内容
    }

    @Test
    @WithMockUser
    void testGetBookCopiesByBookId_Success() throws Exception {
        BookCopyDto copyDto = BookCopyDto.builder()
                .id(1)
                .bookId(10)
                .bookTitle("测试图书")
                .build();
        when(bookCopyService.getBookCopiesByBookId(10)).thenReturn(List.of(copyDto));

        mockMvc.perform(get("/api/books/10/copies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].bookId").value(10));

        verify(bookCopyService).getBookCopiesByBookId(10);
    }

    @Test
    @WithMockUser
    void testGetBookLocationMap_Success() throws Exception {
        BookLocationMapDto dto = BookLocationMapDto.builder()
                .bookId(10)
                .bookTitle("测试图书")
                .generatedMode("DEFAULT_TEMPLATE")
                .highlightedFloorPlanId(3)
                .floors(List.of(
                        BookLocationMapDto.Floor.builder()
                                .floorPlanId(3)
                                .floorOrder(3)
                                .floorName("3F")
                                .build()))
                .build();
        when(bookLocationMapService.getBookLocationMap(10)).thenReturn(dto);

        mockMvc.perform(get("/api/books/10/location-map"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookId").value(10))
                .andExpect(jsonPath("$.highlightedFloorPlanId").value(3))
                .andExpect(jsonPath("$.floors", hasSize(1)));

        verify(bookLocationMapService).getBookLocationMap(10);
    }

    @Test
    @WithMockUser
    void testGetTrendingBooks_HotAlias_Success() throws Exception {
        when(bookService.getTrendingBooks(8)).thenReturn(List.of(testBookDto));

        mockMvc.perform(get("/api/books/hot").param("limit", "8"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].bookId").value(1))
                .andExpect(jsonPath("$[0].title").value("Spring Boot 实战"));

        verify(bookService).getTrendingBooks(8);
        verify(bookService, never()).getBookById(anyInt());
    }

}
