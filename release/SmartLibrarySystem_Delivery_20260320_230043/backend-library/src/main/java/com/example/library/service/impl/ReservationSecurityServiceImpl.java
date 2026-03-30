package com.example.library.service.impl;

import com.example.library.entity.Reservation;
import com.example.library.repository.ReservationRepository;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.ReservationSecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * 预约数据权限服务。
 * 用于校验当前登录用户是否拥有指定预约记录。
 */
@Service
@RequiredArgsConstructor
public class ReservationSecurityServiceImpl implements ReservationSecurityService {
    private final ReservationRepository reservationRepository;

    @Override
    public boolean isReservationOwner(Authentication authentication, Integer reservationId) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof UserDetailsImpl)) {
            return false;
        }

        UserDetailsImpl userDetails = (UserDetailsImpl) principal;
        Integer userId = userDetails.getId();

        // 预约相关接口允许管理员和本人访问，本方法专门服务于“本人”判定。
        Optional<Reservation> reservationOpt = reservationRepository.findById(reservationId);
        if (reservationOpt.isEmpty()) {
            return false;
        }

        return reservationOpt.get().getUser().getUserId().equals(userId);
    }
}
