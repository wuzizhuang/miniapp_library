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
 * Default author service implementation.
 */
@Service
@RequiredArgsConstructor
public class AuthorServiceImpl implements AuthorService {

    private final AuthorRepository authorRepository;

    /**
     * Returns an author by id.
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
     * Creates an author.
     */
    @Override
    @Transactional
    public AuthorDto createAuthor(AuthorDto authorDto) {
        Author author = convertToEntity(authorDto);
        Author savedAuthor = authorRepository.save(author);
        return convertToDto(savedAuthor);
    }

    /**
     * Updates an author.
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
     * Soft-deletes an author.
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
     * Returns paged authors.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<AuthorDto> getAllAuthors(Pageable pageable) {
        return authorRepository.findByDeletedFalse(pageable).map(this::convertToDto);
    }

    /**
     * Searches authors by name.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<AuthorDto> searchAuthorsByName(String name, Pageable pageable) {
        return authorRepository.findByNameContainingIgnoreCaseAndDeletedFalse(name, pageable)
                .map(this::convertToDto);
    }

    /**
     * Maps entity to DTO.
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
     * Maps DTO to entity.
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
