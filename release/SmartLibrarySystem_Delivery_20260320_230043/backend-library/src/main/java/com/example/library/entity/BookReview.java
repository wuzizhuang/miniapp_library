package com.example.library.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

/**
 * 图书评论实体。
 * 保存用户对图书的评分、评论内容以及审核状态。
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

    /** 评论审核状态。 */
    public enum ReviewStatus {
        PENDING, APPROVED, REJECTED
    }
}
