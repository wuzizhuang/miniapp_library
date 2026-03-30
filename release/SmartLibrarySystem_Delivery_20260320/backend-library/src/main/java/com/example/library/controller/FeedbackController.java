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
 * Endpoints for user feedback submission and querying.
 */
@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    /**
     * Submit a feedback ticket.
     */
    @PostMapping
    public ResponseEntity<FeedbackDto> createFeedback(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody FeedbackCreateDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(feedbackService.createFeedback(userDetails.getId(), dto));
    }

    /**
     * Returns current user's feedback tickets.
     */
    @GetMapping("/me")
    public ResponseEntity<Page<FeedbackDto>> getMyFeedback(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(feedbackService.getMyFeedback(userDetails.getId(), page, size));
    }

    /**
     * Appends a follow-up message to an existing feedback ticket.
     */
    @PostMapping("/{feedbackId}/follow-up")
    public ResponseEntity<FeedbackDto> appendFollowUp(
            @PathVariable Long feedbackId,
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody FeedbackFollowUpDto dto) {
        return ResponseEntity.ok(feedbackService.appendUserMessage(feedbackId, userDetails.getId(), dto));
    }
}
