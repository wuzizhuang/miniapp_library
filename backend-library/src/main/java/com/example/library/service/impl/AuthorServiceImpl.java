package com.example.library.service.impl;

import com.example.library.dto.AuthorDto;
import com.example.library.entity.Author;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.AuthorRepository;
import com.example.library.service.AuthorService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 作者服务实现类。
 * 负责作者的增删改查、搜索以及实体转换。
 */
@Service
@RequiredArgsConstructor
public class AuthorServiceImpl implements AuthorService {

    private final AuthorRepository authorRepository;

    /**
     * 根据作者 ID 查询详情。
     */
    @Override
    public AuthorDto getAuthorById(Integer authorId) {
        Author author = authorRepository.findById(authorId)
                .orElseThrow(() -> new ResourceNotFoundException("Author not found: " + authorId));
        if (Boolean.TRUE.equals(author.getDeleted())) {
            throw new ResourceNotFoundException("Author not found: " + authorId);
        }
        return convertToDto(author);
    }

    /**
     * 创建作者。
     */
    @Override
    @Transactional
    public AuthorDto createAuthor(AuthorDto authorDto) {
        Author author = convertToEntity(authorDto);
        Author savedAuthor = authorRepository.save(author);
        return convertToDto(savedAuthor);
    }

    /**
     * 更新作者信息。
     */
    @Override
    @Transactional
    public AuthorDto updateAuthor(Integer authorId, AuthorDto authorDto) {
        Author author = authorRepository.findById(authorId)
                .orElseThrow(() -> new ResourceNotFoundException("Author not found: " + authorId));
        author.setName(authorDto.getName());
        author.setBiography(authorDto.getBiography());
        author.setBirthYear(authorDto.getBirthYear());
        author.setDeathYear(authorDto.getDeathYear());
        return convertToDto(authorRepository.save(author));
    }

    /**
     * 软删除作者。
     * 通过标记删除并改名的方式避免唯一索引冲突。
     */
    @Override
    @Transactional
    public void deleteAuthor(Integer authorId) {
        Author author = authorRepository.findById(authorId)
                .orElseThrow(() -> new ResourceNotFoundException("Author not found: " + authorId));
        author.setDeleted(true);
        author.setName(author.getName() + "_DELETED_" + System.currentTimeMillis());
        authorRepository.save(author);
    }

    /**
     * 分页查询未删除作者。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<AuthorDto> getAllAuthors(Pageable pageable) {
        return authorRepository.findByDeletedFalse(pageable).map(this::convertToDto);
    }

    /**
     * 按姓名模糊搜索作者。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<AuthorDto> searchAuthorsByName(String name, Pageable pageable) {
        return authorRepository.findByNameContainingIgnoreCaseAndDeletedFalse(name, pageable)
                .map(this::convertToDto);
    }

    /**
     * 将作者实体转换为 DTO。
     */
    private AuthorDto convertToDto(Author author) {
        AuthorDto dto = new AuthorDto();
        dto.setAuthorId(author.getAuthorId());
        dto.setName(author.getName());
        dto.setBiography(author.getBiography());
        dto.setBirthYear(author.getBirthYear());
        dto.setDeathYear(author.getDeathYear());
        return dto;
    }

    /**
     * 将 DTO 转换为作者实体。
     */
    private Author convertToEntity(AuthorDto dto) {
        Author author = new Author();
        if (dto.getAuthorId() != null) {
            author.setAuthorId(dto.getAuthorId());
        }
        author.setName(dto.getName());
        author.setBiography(dto.getBiography());
        author.setBirthYear(dto.getBirthYear());
        author.setDeathYear(dto.getDeathYear());
        return author;
    }
}
