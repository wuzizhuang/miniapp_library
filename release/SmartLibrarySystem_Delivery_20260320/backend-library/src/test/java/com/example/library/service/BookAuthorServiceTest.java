package com.example.library.service;

import com.example.library.entity.Author;
import com.example.library.entity.Book;
import com.example.library.entity.BookAuthor;
import com.example.library.exception.ResourceNotFoundException; // 确保你定义了这个异常
import com.example.library.repository.AuthorRepository;
import com.example.library.repository.BookAuthorRepository;
import com.example.library.repository.BookRepository;
import com.example.library.service.impl.BookAuthorServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class BookAuthorServiceTest {
    @Mock
    private BookAuthorRepository bookAuthorRepository;
    @Mock
    private BookRepository bookRepository;
    @Mock
    private AuthorRepository authorRepository;
    @InjectMocks
    private BookAuthorServiceImpl bookAuthorService;


    private Book book;
    private Author author;

    @BeforeEach
    void setUp(){
        // 初始化测试数据
        book = new Book();
        book.setBookId(1);
        book.setTitle("测试书籍");

        author = new Author();
        author.setAuthorId(1);
        author.setName("测试作者");
    }
    @Test
    void addAuthorToBook_successful() {
        int authorId = 1;
        int bookId = 1;
        int authorOrder = 1;

        when(bookRepository.findById(bookId)).thenReturn(Optional.of(book));
        when(authorRepository.findById(authorId)).thenReturn(Optional.of(author));
        when(bookAuthorRepository.existsByBookBookIdAndAuthorAuthorId(bookId, authorId)).thenReturn(false);

        bookAuthorService.addAuthorToBook(authorId, bookId, authorOrder);

        // 验证 repository 方法是否被调用
        verify(authorRepository, times(1)).findById(authorId);
        verify(bookRepository, times(1)).findById(bookId);
        verify(bookAuthorRepository, times(1)).existsByBookBookIdAndAuthorAuthorId(bookId, authorId);
        verify(bookAuthorRepository, times(1)).save(any(BookAuthor.class));

    }
    @Test
    void addAuthorToBook_authorNotFound() {
        // 测试当作者不存在时，是否抛出 ResourceNotFoundException
        int authorId = 1;
        int bookId = 1;
        int authorOrder = 1;
        // 模拟 authorRepository.findById() 返回空 Optional
        when(authorRepository.findById(authorId)).thenReturn(Optional.empty());
        // 断言是否抛出 ResourceNotFoundException
        assertThrows(ResourceNotFoundException.class, () -> {
            bookAuthorService.addAuthorToBook(authorId, bookId, authorOrder);
        });
        // 验证 authorRepository.findById() 是否被调用
        verify(authorRepository, times(1)).findById(authorId);
        // 验证其他 repository 方法未被调用
        verify(bookRepository, never()).findById(anyInt());
        verify(bookAuthorRepository, never()).existsByBookBookIdAndAuthorAuthorId(anyInt(), anyInt());
        verify(bookAuthorRepository, never()).save(any(BookAuthor.class));
    }

}
