package com.example.library.controller;

import com.example.library.dto.book.BookCopyCreateDto;
import com.example.library.dto.book.BookCopyDto;
import com.example.library.dto.book.BookCopyUpdateDto;
import com.example.library.entity.BookCopy;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.BookCopyService;
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
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;


@WebMvcTest(BookCopyController.class)
@Import({SecurityConfig.class, AuthEntryPointJwt.class})
public class BookCopyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private BookCopyService bookCopyService;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    private BookCopyDto bookCopyDto;
    private BookCopyCreateDto bookCopyCreateDto;
    private BookCopyUpdateDto bookCopyUpdateDto;
    private Page<BookCopyDto> bookCopyPage;

    @TestConfiguration
    static class BookCopyServiceTestConfig {
        @Bean
        public BookCopyService bookCopyService() {
            return Mockito.mock(BookCopyService.class);
        }
    }

    @BeforeEach
    void setUp() {
        Mockito.reset(bookCopyService);
        bookCopyDto = BookCopyDto.builder()
                .id(1)
                .bookId(10)
                .bookTitle("测试图书")
                .isbn("ISBN-1234")
                .status(BookCopy.CopyStatus.AVAILABLE)
                .acquisitionDate(LocalDate.of(2024, 1, 10))
                .price(new BigDecimal("88.50"))
                .notes("馆藏备注")
                .createTime(LocalDateTime.of(2024, 1, 10, 9, 0))
                .updateTime(LocalDateTime.of(2024, 2, 1, 10, 0))
                .locationCode("LOC-001")
                .rfidTag("RFID-001")
                .floorPlanId(2)
                .build();

        bookCopyCreateDto = BookCopyCreateDto.builder()
                .bookId(10)
                .status(BookCopy.CopyStatus.AVAILABLE)
                .acquisitionDate(LocalDate.of(2024, 1, 10))
                .price(new BigDecimal("88.50"))
                .notes("馆藏备注")
                .build();

        bookCopyUpdateDto = BookCopyUpdateDto.builder()
                .status(BookCopy.CopyStatus.BORROWED)
                .acquisitionDate(LocalDate.of(2024, 1, 11))
                .price(new BigDecimal("90.00"))
                .notes("更新后的备注")
                .build();

        bookCopyPage = new PageImpl<>(
                List.of(bookCopyDto),
                PageRequest.of(0, 10, Sort.by(Sort.Direction.ASC, "id")),
                1
        );
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testCreateBookCopy_AdminSuccess() throws Exception {
        when(bookCopyService.createBookCopy(any(BookCopyCreateDto.class))).thenReturn(bookCopyDto);

        mockMvc.perform(post("/api/book-copies")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(bookCopyCreateDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.bookTitle", is("测试图书")))
                .andExpect(jsonPath("$.status", is("AVAILABLE")));

        verify(bookCopyService).createBookCopy(any(BookCopyCreateDto.class));
    }

    @Test
    void testCreateBookCopy_Unauthorized() throws Exception {
        mockMvc.perform(post("/api/book-copies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bookCopyCreateDto)))
                .andExpect(status().isUnauthorized());

        verify(bookCopyService, never()).createBookCopy(any(BookCopyCreateDto.class));
    }

    @Test
    @WithMockUser(roles = "USER")
    void testCreateBookCopy_ForbiddenForNonAdmin() throws Exception {
        mockMvc.perform(post("/api/book-copies")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bookCopyCreateDto)))
                .andExpect(status().isForbidden());

        verify(bookCopyService, never()).createBookCopy(any(BookCopyCreateDto.class));
    }

    @Test
    @WithMockUser
    void testGetBookCopyById_Success() throws Exception {
        when(bookCopyService.getBookCopyById(1)).thenReturn(bookCopyDto);

        mockMvc.perform(get("/api/book-copies/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isbn", is("ISBN-1234")))
                .andExpect(jsonPath("$.locationCode", is("LOC-001")));

        verify(bookCopyService).getBookCopyById(1);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testUpdateBookCopy_AdminSuccess() throws Exception {
        BookCopyDto updatedDto = BookCopyDto.builder()
                .id(bookCopyDto.getId())
                .bookId(bookCopyDto.getBookId())
                .bookTitle(bookCopyDto.getBookTitle())
                .isbn(bookCopyDto.getIsbn())
                .status(BookCopy.CopyStatus.BORROWED)
                .acquisitionDate(bookCopyDto.getAcquisitionDate())
                .price(bookCopyDto.getPrice())
                .notes("更新后的备注")
                .createTime(bookCopyDto.getCreateTime())
                .updateTime(bookCopyDto.getUpdateTime())
                .locationCode(bookCopyDto.getLocationCode())
                .rfidTag(bookCopyDto.getRfidTag())
                .floorPlanId(bookCopyDto.getFloorPlanId())
                .build();
        when(bookCopyService.updateBookCopy(eq(1), any(BookCopyUpdateDto.class))).thenReturn(updatedDto);

        mockMvc.perform(put("/api/book-copies/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bookCopyUpdateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("BORROWED")))
                .andExpect(jsonPath("$.notes", is("更新后的备注")));

        verify(bookCopyService).updateBookCopy(eq(1), any(BookCopyUpdateDto.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testDeleteBookCopy_AdminSuccess() throws Exception {
        mockMvc.perform(delete("/api/book-copies/1"))
                .andExpect(status().isNoContent());

        verify(bookCopyService).deleteBookCopy(1);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetAllBookCopies_WithBookIdFilter() throws Exception {
        when(bookCopyService.getAllBookCopies(0, 10, "id", "ASC", 10, "AVAILABLE", "测试"))
                .thenReturn(bookCopyPage);

        mockMvc.perform(get("/api/book-copies")
                        .param("page", "0")
                        .param("size", "10")
                        .param("sortBy", "id")
                        .param("direction", "ASC")
                        .param("bookId", "10")
                        .param("status", "AVAILABLE")
                        .param("keyword", "测试"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].bookId", is(10)))
                .andExpect(jsonPath("$.content[0].bookTitle", is("测试图书")));

        verify(bookCopyService).getAllBookCopies(0, 10, "id", "ASC", 10, "AVAILABLE", "测试");
    }

}
