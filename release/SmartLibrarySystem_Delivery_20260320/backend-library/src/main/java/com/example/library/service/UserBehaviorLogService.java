package com.example.library.service;

import com.example.library.entity.UserBehaviorLog;

/**
 * User behavior tracking service.
 */
public interface UserBehaviorLogService {

    /**
     * Records a user behavior event asynchronously.
     * Silently ignores invalid actionType values — never throws to caller.
     *
     * @param userId          the user ID (nullable for anonymous users)
     * @param bookId          the book ID
     * @param actionType      raw action string, matched against
     *                        {@link UserBehaviorLog.ActionType}
     * @param durationSeconds optional page dwell time in seconds
     * @param deviceType      optional device type string
     */
    void logBehavior(Integer userId, Integer bookId, String actionType,
            Integer durationSeconds, String deviceType);
}
