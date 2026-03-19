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
 * Admin endpoints for handling user feedback tickets.
 */
@RestController
@RequestMapping("/api/admin/feedback")
@RequiredArgsConstructor
public class AdminFeedbackController {

    private final FeedbackService feedbackService;

    /**
     * Returns paged feedback list for admin.
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
     * Returns grouped feedback counts by status.
     */
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<java.util.List<DashboardBreakdownItemDto>> getFeedbackStats() {
        return ResponseEntity.ok(feedbackService.getFeedbackStatusStats());
    }

    /**
     * Reply and update status for a feedback ticket.
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
