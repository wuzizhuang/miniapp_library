package com.example.library.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 用户收藏实体。
 * 表示某个用户收藏了某本图书，并通过联合唯一键防止重复收藏。
 */
@Entity
@Table(
        name = "user_favorites",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_user_favorite_user_book", columnNames = { "user_id", "book_id" })
        })
@Getter
@Setter
public class UserFavorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long favoriteId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @Column(name = "create_time", nullable = false, updatable = false)
    private LocalDateTime createTime;

    /**
     * 在首次持久化前补齐创建时间。
     */
    @PrePersist
    protected void onCreate() {
        createTime = LocalDateTime.now();
    }
}
