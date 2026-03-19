package com.example.library.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

/**
 * Book review entity.
 */
@Entity
@Table(
        name = "book_reviews",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_book_review_loan", columnNames = { "loan_id" })
        })
@Data
public class BookReview {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long reviewId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "loan_id")
    private Integer loanId;

    @Column(nullable = false)
    private Integer rating;

    @Lob
    private String commentText;

    @Enumerated(EnumType.STRING)
    private ReviewStatus status = ReviewStatus.PENDING;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createTime;

    @UpdateTimestamp
    private LocalDateTime updateTime;

    public enum ReviewStatus {
        PENDING, APPROVED, REJECTED
    }
}
