package com.example.library.repository;

import com.example.library.entity.UserFeedbackMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for feedback conversation messages.
 */
@Repository
public interface UserFeedbackMessageRepository extends JpaRepository<UserFeedbackMessage, Long> {

    /**
     * Returns all messages for a feedback conversation ordered by create time.
     */
    @Query("""
            SELECT m FROM UserFeedbackMessage m
            WHERE m.feedback.feedbackId = :feedbackId
            ORDER BY m.createTime ASC, m.messageId ASC
            """)
    List<UserFeedbackMessage> findConversationByFeedbackId(@Param("feedbackId") Long feedbackId);
}
