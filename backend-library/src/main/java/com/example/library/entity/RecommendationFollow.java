package com.example.library.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 推荐关注实体。
 * 表示普通读者关注某位教师推荐人的关系。
 */
@Entity
@Table(
        name = "recommendation_follows",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_recommendation_follow", columnNames = { "follower_user_id", "teacher_user_id" })
        })
@Getter
@Setter
@ToString
public class RecommendationFollow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "follow_id")
    private Long followId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "follower_user_id", nullable = false)
    @ToString.Exclude
    private User follower;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_user_id", nullable = false)
    @ToString.Exclude
    private User teacher;

    @CreationTimestamp
    @Column(name = "create_time", nullable = false, updatable = false)
    private LocalDateTime createTime;
}
