package com.example.library.controller;

import com.example.library.dto.DashboardBreakdownItemDto;
import com.example.library.dto.FeedbackDto;
import com.example.library.dto.FeedbackReplyDto;
import com.example.library.entity.UserFeedback;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 后台反馈工单控制器。
 * 负责反馈列表、状态统计和管理员回复接口。
 */
@RestController
@RequestMapping("/api/admin/feedback")
@RequiredArgsConstructor
public class AdminFeedbackController {

    private final FeedbackService feedbackService;

    /**
     * 分页查询全部反馈工单。
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<FeedbackDto>> getAllFeedback(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) UserFeedback.FeedbackStatus status) {
        return ResponseEntity.ok(feedbackService.getAllFeedback(page, size, status));
    }

    /**
     * 统计反馈工单各状态数量。
     */
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<java.util.List<DashboardBreakdownItemDto>> getFeedbackStats() {
        return ResponseEntity.ok(feedbackService.getFeedbackStatusStats());
    }

    /**
     * 回复反馈并更新工单状态。
     */
    @PutMapping("/{id}/reply")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FeedbackDto> replyFeedback(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody FeedbackReplyDto dto) {
        return ResponseEntity.ok(feedbackService.replyFeedback(id, dto, userDetails.getUsername()));
    }
}
