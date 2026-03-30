package com.example.library.repository;

import com.example.library.entity.UserBehaviorLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for user behavior logs.
 */
@Repository
public interface UserBehaviorLogRepository extends JpaRepository<UserBehaviorLog, Long> {

    /**
     * Returns a user's behavior for a specific book and action.
     */
    List<UserBehaviorLog> findByUserIdAndBookIdAndActionType(Integer userId, Integer bookId, UserBehaviorLog.ActionType actionType);

    /**
     * Counts a specific action type for a book.
     */
    @Query("SELECT COUNT(u) FROM UserBehaviorLog u WHERE u.bookId = :bookId AND u.actionType = :actionType")
    Long countByBookIdAndActionType(@Param("bookId") Integer bookId, @Param("actionType") UserBehaviorLog.ActionType actionType);

    /**
     * Returns grouped counts for each action type.
     */
    @Query("""
            SELECT u.actionType, COUNT(u)
            FROM UserBehaviorLog u
            GROUP BY u.actionType
            ORDER BY COUNT(u) DESC, u.actionType ASC
            """)
    List<Object[]> countGroupedByActionType();

    /**
     * Returns recent behaviors for a user.
     */
    Page<UserBehaviorLog> findByUserIdOrderByCreateTimeDesc(Integer userId, Pageable pageable);
}
