package com.example.library.repository;

import com.example.library.entity.BookCopy;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for book copy queries.
 */
@Repository
public interface BookCopyRepository extends JpaRepository<BookCopy, Integer>, JpaSpecificationExecutor<BookCopy> {

    /**
     * Returns copies for a book.
     */
    List<BookCopy> findByBookBookId(Integer bookId);

    /**
     * Returns available copies for a book.
     */
    @Query("SELECT bc FROM BookCopy bc WHERE bc.book.bookId = :bookId AND bc.status = 'AVAILABLE'")
    List<BookCopy> findAvailableCopiesByBookId(@Param("bookId") Integer bookId);

    /**
     * Returns the first available copy for a book with a pessimistic lock.
     */
    @Query("""
            SELECT bc FROM BookCopy bc
            WHERE bc.book.bookId = :bookId AND bc.status = 'AVAILABLE'
            ORDER BY bc.copyId ASC
            """)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<BookCopy> findAvailableCopiesByBookIdWithLock(@Param("bookId") Integer bookId, org.springframework.data.domain.Pageable pageable);

    /**
     * Returns count of available copies for a book.
     */
    @Query("SELECT COUNT(bc) FROM BookCopy bc WHERE bc.book.bookId = :bookId AND bc.status = 'AVAILABLE'")
    Long countAvailableCopiesByBookId(@Param("bookId") Integer bookId);

    /**
     * Returns total copy count for a book.
     */
    Long countByBookBookId(Integer bookId);

    /**
     * Returns a copy by id with pessimistic lock.
     */
    @Query("SELECT bc FROM BookCopy bc WHERE bc.copyId = :id")
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<BookCopy> findByCopyIdWithLock(@Param("id") Integer id);

    /**
     * Returns total available copy count.
     */
    @Query("SELECT COUNT(bc) FROM BookCopy bc WHERE bc.status = 'AVAILABLE'")
    long countTotalAvailableCopies();

    /**
     * Updates copy status for all copies of a book.
     */
    @Modifying
    @Query("UPDATE BookCopy bc SET bc.status = :status WHERE bc.book.bookId = :bookId")
    void updateStatusByBookId(@Param("status") BookCopy.CopyStatus status, @Param("bookId") Integer bookId);
}
