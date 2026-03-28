package com.example.library.controller;

import com.example.library.dto.FeedbackCreateDto;
import com.example.library.dto.FeedbackDto;
import com.example.library.dto.FeedbackFollowUpDto;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 用户反馈控制器。
 * 提供反馈提交、我的反馈查询和追问补充接口。
 */
@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    /**
     * 提交一条新的反馈工单。
     */
    @PostMapping
    public ResponseEntity<FeedbackDto> createFeedback(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody FeedbackCreateDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(feedbackService.createFeedback(userDetails.getId(), dto));
    }

    /**
     * 分页查询当前用户的反馈工单。
     */
    @GetMapping("/me")
    public ResponseEntity<Page<FeedbackDto>> getMyFeedback(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(feedbackService.getMyFeedback(userDetails.getId(), page, size));
    }

    /**
     * 为现有反馈追加一条用户补充消息。
     */
    @PostMapping("/{feedbackId}/follow-up")
    public ResponseEntity<FeedbackDto> appendFollowUp(
            @PathVariable Long feedbackId,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody FeedbackFollowUpDto dto) {
        return ResponseEntity.ok(feedbackService.appendUserMessage(feedbackId, userDetails.getId(), dto));
    }
}
