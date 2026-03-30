package com.example.library.controller;

import com.example.library.dto.UserBehaviorRequestDto;
import com.example.library.security.RequestRateLimitService;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.UserBehaviorLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 用户行为日志控制器。
 * 提供客户端行为埋点上报接口，支持匿名和登录用户提交。
 */
@RestController
@RequestMapping("/api/behavior-logs")
@RequiredArgsConstructor
public class UserBehaviorLogController {

    private final UserBehaviorLogService userBehaviorLogService;
    private final RequestRateLimitService requestRateLimitService;

    /**
     * 记录一条用户行为事件。
     * 该接口会立即返回 204，实际写库由异步服务完成。
     */
    @PostMapping
    public ResponseEntity<Void> logBehavior(
            HttpServletRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody UserBehaviorRequestDto requestDto) {
        Integer userId = (userDetails != null) ? userDetails.getId() : null;
        requestRateLimitService.checkBehaviorLogLimit(request, userId);
        userBehaviorLogService.logBehavior(
                userId,
                requestDto.getBookId().intValue(),
                requestDto.getActionType(),
                requestDto.getDurationSeconds(),
                requestDto.getDeviceType());
        return ResponseEntity.noContent().build();
    }
}
