package com.example.library.repository;

import com.example.library.entity.UserFeedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for user feedback tickets.
 */
@Repository
public interface UserFeedbackRepository extends JpaRepository<UserFeedback, Long> {

    /**
     * Returns feedback submitted by a user.
     */
    @EntityGraph(attributePaths = "messages")
    Page<UserFeedback> findByUserUserIdOrderByCreateTimeDesc(Integer userId, Pageable pageable);

    /**
     * Returns all feedback by status.
     */
    @EntityGraph(attributePaths = "messages")
    Page<UserFeedback> findByStatus(UserFeedback.FeedbackStatus status, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "messages")
    Page<UserFeedback> findAll(Pageable pageable);

    /**
     * Returns a feedback ticket by id and owner.
     */
    @EntityGraph(attributePaths = "messages")
    java.util.Optional<UserFeedback> findByFeedbackIdAndUserUserId(Long feedbackId, Integer userId);

    @Query("SELECT f.status, COUNT(f) FROM UserFeedback f GROUP BY f.status")
    List<Object[]> countGroupedByStatus();
}
