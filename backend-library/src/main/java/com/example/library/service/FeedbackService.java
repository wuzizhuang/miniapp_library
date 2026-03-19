package com.example.library.service;

import com.example.library.dto.DashboardBreakdownItemDto;
import com.example.library.dto.FeedbackCreateDto;
import com.example.library.dto.FeedbackDto;
import com.example.library.dto.FeedbackFollowUpDto;
import com.example.library.dto.FeedbackReplyDto;
import com.example.library.entity.UserFeedback;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Feedback service.
 */
public interface FeedbackService {

    /**
     * Creates a feedback ticket from current user.
     */
    FeedbackDto createFeedback(Integer userId, FeedbackCreateDto dto);

    /**
     * Returns current user's feedback tickets.
     */
    Page<FeedbackDto> getMyFeedback(Integer userId, int page, int size);

    /**
     * Returns all feedback tickets for admin.
     */
    Page<FeedbackDto> getAllFeedback(int page, int size, UserFeedback.FeedbackStatus status);

    /**
     * Returns grouped feedback counts by status.
     */
    List<DashboardBreakdownItemDto> getFeedbackStatusStats();

    /**
     * Admin replies and updates status for a feedback ticket.
     */
    FeedbackDto replyFeedback(Long feedbackId, FeedbackReplyDto dto, String adminUsername);

    /**
     * Appends a follow-up message from the feedback owner.
     */
    FeedbackDto appendUserMessage(Long feedbackId, Integer userId, FeedbackFollowUpDto dto);
}
