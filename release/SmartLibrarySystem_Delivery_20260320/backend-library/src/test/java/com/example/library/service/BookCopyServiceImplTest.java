package com.example.library.service;

import com.example.library.dto.book.BookCopyCreateDto;
import com.example.library.dto.book.BookCopyDto;
import com.example.library.dto.book.BookCopyUpdateDto;
import com.example.library.entity.*;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.BookCopyRepository;
import com.example.library.repository.BookRepository;
import com.example.library.service.impl.BookCopyServiceImpl;
import com.example.library.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * BookCopyServiceImpl 单元测试。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("BookCopyService 单元测试")
class BookCopyServiceImplTest {

    @Mock
    private BookCopyRepository bookCopyRepository;
    @Mock
    private BookRepository bookRepository;

    @InjectMocks
    private BookCopyServiceImpl bookCopyService;

    private Book book;
    private BookCopy copy;

    @BeforeEach
    void setUp() {
        book = TestDataFactory.createBook(10, "Effective Java", "978-0-13-468599-1");
        copy = TestDataFactory.createAvailableCopy(1, book);
    }

    @Nested
    @DisplayName("createBookCopy — 创建副本")
    class CreateBookCopy {

        @Test
        @DisplayName("成功：关联图书存在，副本保存成功")
        void success() {
            BookCopyCreateDto dto = new BookCopyCreateDto();
            dto.setBookId(10);
            dto.setStatus(BookCopy.CopyStatus.AVAILABLE);
            dto.setAcquisitionDate(LocalDate.now());
            dto.setPrice(BigDecimal.valueOf(39.90));

            when(bookRepository.findById(10)).thenReturn(Optional.of(book));
            when(bookCopyRepository.save(any(BookCopy.class))).thenReturn(copy);

            BookCopyDto result = bookCopyService.createBookCopy(dto);

            assertThat(result).isNotNull();
            assertThat(result.getBookId()).isEqualTo(10);
            verify(bookCopyRepository).save(any(BookCopy.class));
        }

        @Test
        @DisplayName("失败：图书不存在，抛出 ResourceNotFoundException")
        void fail_bookNotFound() {
            BookCopyCreateDto dto = new BookCopyCreateDto();
            dto.setBookId(999);

            when(bookRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> bookCopyService.createBookCopy(dto))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("getBookCopyById — 按 ID 查询")
    class GetById {

        @Test
        @DisplayName("成功：返回 DTO")
        void success() {
            when(bookCopyRepository.findById(1)).thenReturn(Optional.of(copy));

            BookCopyDto result = bookCopyService.getBookCopyById(1);

            assertThat(result.getId()).isEqualTo(1);
            assertThat(result.getBookTitle()).isEqualTo("Effective Java");
            assertThat(result.getStatus()).isEqualTo(BookCopy.CopyStatus.AVAILABLE);
        }

        @Test
        @DisplayName("失败：不存在，抛出 ResourceNotFoundException")
        void notFound() {
            when(bookCopyRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> bookCopyService.getBookCopyById(999))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("updateBookCopy — 更新副本")
    class UpdateBookCopy {

        @Test
        @DisplayName("成功：只更新非 null 字段")
        void success_partialUpdate() {
            BookCopyUpdateDto dto = new BookCopyUpdateDto();
            dto.setStatus(BookCopy.CopyStatus.DAMAGED);
            dto.setNotes("有折页");

            when(bookCopyRepository.findById(1)).thenReturn(Optional.of(copy));
            when(bookCopyRepository.save(any(BookCopy.class))).thenReturn(copy);

            BookCopyDto result = bookCopyService.updateBookCopy(1, dto);

            assertThat(copy.getStatus()).isEqualTo(BookCopy.CopyStatus.DAMAGED);
            assertThat(copy.getNotes()).isEqualTo("有折页");
            assertThat(result).isNotNull();
        }
    }

    @Nested
    @DisplayName("deleteBookCopy — 删除副本")
    class DeleteBookCopy {

        @Test
        @DisplayName("成功：调用 deleteById")
        void success() {
            when(bookCopyRepository.existsById(1)).thenReturn(true);

            bookCopyService.deleteBookCopy(1);

            verify(bookCopyRepository).deleteById(1);
        }

        @Test
        @DisplayName("失败：副本不存在，抛出 ResourceNotFoundException")
        void notFound() {
            when(bookCopyRepository.existsById(999)).thenReturn(false);

            assertThatThrownBy(() -> bookCopyService.deleteBookCopy(999))
                    .isInstanceOf(ResourceNotFoundException.class);

            verify(bookCopyRepository, never()).deleteById(anyInt());
        }
    }

    @Nested
    @DisplayName("getBookCopiesByBookId — 按图书查询副本")
    class GetByBookId {

        @Test
        @DisplayName("成功：返回全部副本列表")
        void success() {
            BookCopy copy2 = TestDataFactory.createCopy(2, book, BookCopy.CopyStatus.BORROWED);
            when(bookCopyRepository.findByBookBookId(10)).thenReturn(List.of(copy, copy2));

            List<BookCopyDto> result = bookCopyService.getBookCopiesByBookId(10);

            assertThat(result).hasSize(2);
            assertThat(result.get(0).getStatus()).isEqualTo(BookCopy.CopyStatus.AVAILABLE);
            assertThat(result.get(1).getStatus()).isEqualTo(BookCopy.CopyStatus.BORROWED);
        }
    }
}
