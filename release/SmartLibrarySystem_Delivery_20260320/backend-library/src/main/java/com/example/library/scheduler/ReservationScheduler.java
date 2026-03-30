package com.example.library.scheduler;

import com.example.library.service.ReservationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReservationScheduler {

    private final ReservationService reservationService;

    // 每小时执行一次检查
    @Scheduled(cron = "0 0 * * * ?")
    public void checkExpiredReservations() {
        log.info("Running scheduled task: Check expired reservations");
        reservationService.checkAndExpireReservations();
    }
}