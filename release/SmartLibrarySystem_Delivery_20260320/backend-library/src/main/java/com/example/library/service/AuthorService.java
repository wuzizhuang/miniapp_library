package com.example.library.service;

import com.example.library.dto.AuthorDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Author service.
 */
public interface AuthorService {
    /**
     * Returns an author by id.
     */
    AuthorDto getAuthorById(Integer authorId);

    /**
     * Creates an author.
     */
    AuthorDto createAuthor(AuthorDto authorDto);

    /**
     * Updates an author.
     */
    AuthorDto updateAuthor(Integer authorId, AuthorDto authorDto);

    /**
     * Deletes an author.
     */
    void deleteAuthor(Integer authorId);

    /**
     * Returns paged authors.
     */
    Page<AuthorDto> getAllAuthors(Pageable pageable);

    /**
     * Searches authors by name.
     */
    Page<AuthorDto> searchAuthorsByName(String name, Pageable pageable);
}
