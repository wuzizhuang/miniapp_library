package com.example.library.repository;

import com.example.library.entity.Author;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for author queries.
 */
@Repository
public interface AuthorRepository extends JpaRepository<Author, Integer> {
    Page<Author> findByDeletedFalse(Pageable pageable);
    Page<Author> findByNameContainingIgnoreCaseAndDeletedFalse(String name, Pageable pageable);
}
