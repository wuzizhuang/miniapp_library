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
 * Endpoints for client-side user behavior tracking.
 * Both authenticated and anonymous users may submit events.
 */
@RestController
@RequestMapping("/api/behavior-logs")
@RequiredArgsConstructor
public class UserBehaviorLogController {

    private final UserBehaviorLogService userBehaviorLogService;
    private final RequestRateLimitService requestRateLimitService;

    /**
     * Records a user behavior event (e.g. view book detail, add to shelf).
     * Returns 204 No Content immediately; the actual write is async.
     *
     * @param userDetails null when the caller is unauthenticated
     * @param requestDto  the behavior payload
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
