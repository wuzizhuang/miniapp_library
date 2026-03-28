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
 * 用户行为日志服务实现类。
 * 所有写入均异步执行，避免阻塞主请求线程。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserBehaviorLogServiceImpl implements UserBehaviorLogService {

    private final UserBehaviorLogRepository userBehaviorLogRepository;

    /**
     * 记录一条用户行为日志。
     * 对未知行为类型会直接忽略，避免脏数据进入统计。
     */
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
