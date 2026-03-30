package com.example.library.repository;

import com.example.library.entity.RecommendationLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RecommendationLikeRepository extends JpaRepository<RecommendationLike, Long> {

    interface RecommendationLikeCountView {
        Long getPostId();

        Long getLikeCount();
    }

    Optional<RecommendationLike> findByPostPostIdAndUserUserId(Long postId, Integer userId);

    @Modifying
    void deleteByPostPostId(Long postId);

    @Query("""
            SELECT l.post.postId AS postId, COUNT(l) AS likeCount
            FROM RecommendationLike l
            WHERE l.post.postId IN :postIds
            GROUP BY l.post.postId
            """)
    List<RecommendationLikeCountView> countGroupedByPostIds(@Param("postIds") Collection<Long> postIds);

    @Query("""
            SELECT l.post.postId
            FROM RecommendationLike l
            WHERE l.user.userId = :userId
              AND l.post.postId IN :postIds
            """)
    List<Long> findLikedPostIds(@Param("userId") Integer userId, @Param("postIds") Collection<Long> postIds);
}
