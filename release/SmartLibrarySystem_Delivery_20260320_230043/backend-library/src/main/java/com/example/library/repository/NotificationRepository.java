package com.example.library.repository;

import com.example.library.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Repository for notification queries.
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * Returns paged notifications for a user.
     */
    Page<Notification> findByUserUserIdOrderBySendTimeDesc(Integer userId, Pageable pageable);

    /**
     * Returns unread notification count for a user.
     */
    Long countByUserUserIdAndIsReadFalse(Integer userId);

    /**
     * Returns unread notifications for a user.
     */
    List<Notification> findByUserUserIdAndIsReadFalseOrderBySendTimeDesc(Integer userId);

    /**
     * Checks whether a notification with the same business key was already created.
     */
    boolean existsByUserUserIdAndBusinessKey(Integer userId, String businessKey);

    /**
     * Marks all notifications as read for a user.
     */
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.user.userId = :userId")
    void markAllAsReadForUser(@Param("userId") Integer userId);

    /**
     * Deletes all read notifications for a user.
     */
    @Modifying
    @Transactional
    void deleteByUserUserIdAndIsReadTrue(Integer userId);
}
