package com.example.library.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 推荐点赞实体。
 * 表示用户对某条推荐动态的点赞关系，并通过联合唯一键避免重复点赞。
 */
@Entity
@Table(
        name = "recommendation_likes",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_recommendation_like", columnNames = { "post_id", "user_id" })
        })
@Getter
@Setter
@ToString
public class RecommendationLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "like_id")
    private Long likeId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    @ToString.Exclude
    private RecommendationPost post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    private User user;

    @CreationTimestamp
    @Column(name = "create_time", nullable = false, updatable = false)
    private LocalDateTime createTime;
}
