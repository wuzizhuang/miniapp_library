package com.example.library.repository;

import com.example.library.entity.BookReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for book review queries.
 */
@Repository
public interface BookReviewRepository extends JpaRepository<BookReview, Long> {
    /**
     * Returns reviews for a book by status.
     */
    Page<BookReview> findByBookBookIdAndStatus(Integer bookId, BookReview.ReviewStatus status, Pageable pageable);

    /**
     * Returns true if a loan already has a review.
     */
    boolean existsByLoanId(Integer loanId);

    Optional<BookReview> findByLoanId(Integer loanId);

    /**
     * Returns reviews by user.
     */
    Page<BookReview> findByUserUserId(Integer userId, Pageable pageable);

    /**
     * Returns reviews by moderation status.
     */
    Page<BookReview> findByStatus(BookReview.ReviewStatus status, Pageable pageable);

    /**
     * Returns reviews filtered by status and keyword against book/user fields.
     */
    @Query("""
            SELECT r FROM BookReview r
            WHERE (:status IS NULL OR r.status = :status)
              AND (
                    :keyword IS NULL
                    OR LOWER(r.book.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(r.book.isbn) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(r.user.username) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(r.user.fullName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                  )
            """)
    Page<BookReview> searchForAdmin(
            @Param("status") BookReview.ReviewStatus status,
            @Param("keyword") String keyword,
            Pageable pageable);
}
