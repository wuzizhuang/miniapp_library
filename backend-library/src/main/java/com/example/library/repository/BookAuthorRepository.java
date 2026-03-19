package com.example.library.repository;

import com.example.library.entity.BookAuthor;
import com.example.library.entity.BookAuthor.BookAuthorId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for book-author relationship queries.
 */
@Repository
public interface BookAuthorRepository extends JpaRepository<BookAuthor, BookAuthorId> {

    List<BookAuthor> findByBookBookId(Integer bookId);

    List<BookAuthor> findByAuthorAuthorId(Integer authorId);

    @Query("SELECT ba FROM BookAuthor ba WHERE ba.book.bookId = :bookId ORDER BY ba.authorOrder ASC")
    List<BookAuthor> findBookAuthorsByBookIdOrderByAuthorOrder(@Param("bookId") Integer bookId);

    boolean existsByBookBookIdAndAuthorAuthorId(Integer bookId, Integer authorId);

    void deleteByBookBookId(Integer id);
}
