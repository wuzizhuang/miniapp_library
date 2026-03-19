package com.example.library.service;

import com.example.library.dto.AuthorDto;
import com.example.library.entity.Author;
import com.example.library.repository.AuthorRepository;
import com.example.library.service.impl.AuthorServiceImpl;
import com.example.library.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthorServiceImplTest {

    @Mock
    private AuthorRepository authorRepository;

    @InjectMocks
    private AuthorServiceImpl authorService;

    private Author testAuthor;
    private AuthorDto testAuthorDto;

    @BeforeEach
    void setUp() {
        // 设置测试数据
        testAuthor = new Author();
        testAuthor.setAuthorId(1);
        testAuthor.setName("测试作者");
        testAuthor.setBiography("这是一位测试作家的传记");
        testAuthor.setBirthYear(1980);
        testAuthor.setDeathYear(null); // 假设作者还在世

        testAuthorDto = new AuthorDto();
        testAuthorDto.setAuthorId(1);
        testAuthorDto.setName("测试作者");
        testAuthorDto.setBiography("这是一位测试作家的传记");
        testAuthorDto.setBirthYear(1980);
        testAuthorDto.setDeathYear(null);
    }

    @Test
    void testGetAuthorById_Success() {
        // 设置模拟行为
        when(authorRepository.findById(1)).thenReturn(Optional.of(testAuthor));

        // 执行测试
        AuthorDto result = authorService.getAuthorById(1);

        // 验证结果
        assertNotNull(result);
        assertEquals(testAuthor.getAuthorId(), result.getAuthorId());
        assertEquals(testAuthor.getName(), result.getName());
        assertEquals(testAuthor.getBiography(), result.getBiography());
        assertEquals(testAuthor.getBirthYear(), result.getBirthYear());
        assertEquals(testAuthor.getDeathYear(), result.getDeathYear());

        // 验证调用
        verify(authorRepository, times(1)).findById(1);
    }

    @Test
    void testGetAuthorById_NotFound() {
        // 设置模拟行为
        when(authorRepository.findById(999)).thenReturn(Optional.empty());

        // 验证抛出异常
        assertThrows(ResourceNotFoundException.class, () -> {
            authorService.getAuthorById(999);
        });

        // 验证调用
        verify(authorRepository, times(1)).findById(999);
    }

    @Test
    void testCreateAuthor() {
        // 设置模拟行为
        when(authorRepository.save(any(Author.class))).thenReturn(testAuthor);

        // 执行测试
        AuthorDto newAuthorDto = new AuthorDto();
        newAuthorDto.setName("测试作者");
        newAuthorDto.setBiography("这是一位测试作家的传记");
        newAuthorDto.setBirthYear(1980);

        AuthorDto result = authorService.createAuthor(newAuthorDto);

        // 验证结果
        assertNotNull(result);
        assertEquals(testAuthor.getAuthorId(), result.getAuthorId());
        assertEquals(testAuthor.getName(), result.getName());

        // 验证调用
        verify(authorRepository, times(1)).save(any(Author.class));
    }

    @Test
    void testUpdateAuthor_Success() {
        // 设置模拟行为
        when(authorRepository.findById(1)).thenReturn(Optional.of(testAuthor));
        when(authorRepository.save(any(Author.class))).thenReturn(testAuthor);

        // 准备更新数据
        AuthorDto updateDto = new AuthorDto();
        updateDto.setName("更新的作者名");
        updateDto.setBiography("更新的传记");
        updateDto.setBirthYear(1981);
        updateDto.setDeathYear(2020);

        // 执行测试
        AuthorDto result = authorService.updateAuthor(1, updateDto);

        // 验证结果
        assertNotNull(result);

        // 验证作者属性被更新
        assertEquals("更新的作者名", testAuthor.getName());
        assertEquals("更新的传记", testAuthor.getBiography());
        assertEquals(1981, testAuthor.getBirthYear());
        assertEquals(2020, testAuthor.getDeathYear());

        // 验证调用
        verify(authorRepository, times(1)).findById(1);
        verify(authorRepository, times(1)).save(testAuthor);
    }

    @Test
    void testUpdateAuthor_NotFound() {
        // 设置模拟行为
        when(authorRepository.findById(999)).thenReturn(Optional.empty());

        // 验证抛出异常
        assertThrows(ResourceNotFoundException.class, () -> {
            authorService.updateAuthor(999, new AuthorDto());
        });

        // 验证调用
        verify(authorRepository, times(1)).findById(999);
        verify(authorRepository, never()).save(any(Author.class));
    }

    @Test
    void testDeleteAuthor_Success() {
        // 设置模拟行为
        when(authorRepository.findById(1)).thenReturn(Optional.of(testAuthor));
        when(authorRepository.save(any(Author.class))).thenReturn(testAuthor);

        // 执行测试
        authorService.deleteAuthor(1);

        // 验证调用
        verify(authorRepository, times(1)).findById(1);
        verify(authorRepository, times(1)).save(testAuthor);
    }

    @Test
    void testDeleteAuthor_NotFound() {
        // 设置模拟行为
        when(authorRepository.findById(999)).thenReturn(Optional.empty());

        // 验证抛出异常
        assertThrows(ResourceNotFoundException.class, () -> {
            authorService.deleteAuthor(999);
        });

        // 验证调用
        verify(authorRepository, times(1)).findById(999);
        verify(authorRepository, never()).save(any(Author.class));
    }

    @Test
    void testGetAllAuthors() {
        // 创建测试数据
        List<Author> authors = Arrays.asList(
                testAuthor,
                createAuthor(2, "作者2", "传记2", 1970, 2010));
        Page<Author> authorPage = new PageImpl<>(authors);
        Pageable pageable = PageRequest.of(0, 10);

        // 设置模拟行为
        when(authorRepository.findByDeletedFalse(pageable)).thenReturn(authorPage);

        // 执行测试
        Page<AuthorDto> result = authorService.getAllAuthors(pageable);

        // 验证结果
        assertNotNull(result);
        assertEquals(2, result.getContent().size());
        assertEquals(testAuthor.getName(), result.getContent().get(0).getName());
        assertEquals("作者2", result.getContent().get(1).getName());

        // 验证调用
        verify(authorRepository, times(1)).findByDeletedFalse(pageable);
    }

    @Test
    void testSearchAuthorsByName() {
        // 创建测试数据
        List<Author> authors = Arrays.asList(testAuthor);
        Page<Author> authorPage = new PageImpl<>(authors);
        Pageable pageable = PageRequest.of(0, 10);
        String searchName = "测试";

        // 设置模拟行为
        when(authorRepository.findByNameContainingIgnoreCaseAndDeletedFalse(searchName, pageable))
                .thenReturn(authorPage);

        // 执行测试
        Page<AuthorDto> result = authorService.searchAuthorsByName(searchName, pageable);

        // 验证结果
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals(testAuthor.getName(), result.getContent().get(0).getName());

        // 验证调用
        verify(authorRepository, times(1)).findByNameContainingIgnoreCaseAndDeletedFalse(searchName, pageable);
    }

    // 辅助方法：创建测试作者
    private Author createAuthor(Integer id, String name, String bio, Integer birthYear, Integer deathYear) {
        Author author = new Author();
        author.setAuthorId(id);
        author.setName(name);
        author.setBiography(bio);
        author.setBirthYear(birthYear);
        author.setDeathYear(deathYear);
        return author;
    }
}
