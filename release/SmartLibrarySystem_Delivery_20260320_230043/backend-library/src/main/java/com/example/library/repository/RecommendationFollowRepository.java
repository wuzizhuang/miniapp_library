package com.example.library.repository;

import com.example.library.entity.RecommendationFollow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RecommendationFollowRepository extends JpaRepository<RecommendationFollow, Long> {

    boolean existsByFollowerUserIdAndTeacherUserId(Integer followerUserId, Integer teacherUserId);

    Optional<RecommendationFollow> findByFollowerUserIdAndTeacherUserId(Integer followerUserId, Integer teacherUserId);

    @Query("SELECT f.teacher.userId FROM RecommendationFollow f WHERE f.follower.userId = :followerUserId")
    List<Integer> findTeacherIdsByFollowerUserId(@Param("followerUserId") Integer followerUserId);

    @Query("SELECT f.teacher.userId FROM RecommendationFollow f WHERE f.follower.userId = :followerUserId AND f.teacher.userId IN :teacherUserIds")
    List<Integer> findTeacherIdsByFollowerUserIdAndTeacherIds(
            @Param("followerUserId") Integer followerUserId,
            @Param("teacherUserIds") Collection<Integer> teacherUserIds);

    @Query("SELECT f.follower.userId FROM RecommendationFollow f WHERE f.teacher.userId = :teacherUserId")
    List<Integer> findFollowerIdsByTeacherUserId(@Param("teacherUserId") Integer teacherUserId);
}
