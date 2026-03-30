package com.example.library.repository;

import com.example.library.entity.RecommendationPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecommendationPostRepository extends JpaRepository<RecommendationPost, Long> {

    @Override
    @EntityGraph(attributePaths = { "author", "book" })
    Page<RecommendationPost> findAll(Pageable pageable);

    @EntityGraph(attributePaths = { "author", "book" })
    Page<RecommendationPost> findByAuthorUserIdOrderByCreateTimeDesc(Integer authorUserId, Pageable pageable);

    @EntityGraph(attributePaths = { "author", "book" })
    @Query("""
            SELECT p
            FROM RecommendationPost p
            WHERE p.author.userId IN (
                SELECT f.teacher.userId
                FROM RecommendationFollow f
                WHERE f.follower.userId = :userId
            )
            ORDER BY p.createTime DESC
            """)
    Page<RecommendationPost> findFollowingFeed(@Param("userId") Integer userId, Pageable pageable);
}
