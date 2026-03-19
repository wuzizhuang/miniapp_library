package com.example.library.service.impl;

import com.example.library.entity.UserBehaviorLog;
import com.example.library.repository.UserBehaviorLogRepository;
import com.example.library.service.UserBehaviorLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Default implementation of user behavior logging.
 * All writes are async so they never block the main HTTP thread.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserBehaviorLogServiceImpl implements UserBehaviorLogService {

    private final UserBehaviorLogRepository userBehaviorLogRepository;

    @Override
    @Async
    @Transactional
    public void logBehavior(Integer userId, Integer bookId, String actionType,
            Integer durationSeconds, String deviceType) {
        if (bookId == null || actionType == null || actionType.isBlank()) {
            return;
        }
        UserBehaviorLog.ActionType parsedAction;
        try {
            parsedAction = UserBehaviorLog.ActionType.valueOf(actionType.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.debug("Ignored unknown actionType '{}' from userId={}", actionType, userId);
            return;
        }

        UserBehaviorLog log = new UserBehaviorLog();
        log.setUserId(userId);
        log.setBookId(bookId);
        log.setActionType(parsedAction);
        log.setDurationSeconds(durationSeconds);
        log.setDeviceType(deviceType);
        userBehaviorLogRepository.save(log);
    }
}
