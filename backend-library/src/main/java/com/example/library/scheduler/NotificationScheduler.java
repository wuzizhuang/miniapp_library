package com.example.library.scheduler;

import com.example.library.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled notification jobs.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationScheduler {

    private final NotificationService notificationService;

    @Scheduled(cron = "${library.notification.due-reminder-cron:0 0 9 * * ?}")
    public void sendDueDateReminders() {
        log.info("Running scheduled task: Send due-date reminders");
        notificationService.sendDueDateReminders();
    }
}
