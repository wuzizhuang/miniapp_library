package com.example.library.service.impl;

import com.example.library.dto.DashboardBreakdownItemDto;
import com.example.library.dto.FeedbackCreateDto;
import com.example.library.dto.FeedbackDto;
import com.example.library.dto.FeedbackFollowUpDto;
import com.example.library.dto.FeedbackMessageDto;
import com.example.library.dto.FeedbackReplyDto;
import com.example.library.entity.Notification;
import com.example.library.entity.User;
import com.example.library.entity.UserFeedback;
import com.example.library.entity.UserFeedbackMessage;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.NotificationRepository;
import com.example.library.repository.UserFeedbackRepository;
import com.example.library.repository.UserRepository;
import com.example.library.service.FeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * 反馈服务实现类。
 * 负责反馈创建、后台回复、消息串构建、状态统计以及通知下发。
 */
@Service
@RequiredArgsConstructor
public class FeedbackServiceImpl implements FeedbackService {

    private final UserRepository userRepository;
    private final UserFeedbackRepository feedbackRepository;
    private final NotificationRepository notificationRepository;

    /**
     * 创建用户反馈工单，并写入首条用户消息。
     */
    @Override
    @Transactional
    public FeedbackDto createFeedback(Integer userId, FeedbackCreateDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        UserFeedback feedback = new UserFeedback();
        feedback.setUser(user);
        feedback.setCategory(dto.getCategory());
        feedback.setSubject(trimText(dto.getSubject()));
        feedback.setContent(trimText(dto.getContent()));
        feedback.setContactEmail(trimNullable(dto.getContactEmail()));
        feedback.setStatus(UserFeedback.FeedbackStatus.SUBMITTED);
        feedback.addMessage(createMessage(
                UserFeedbackMessage.SenderType.USER,
                user.getUserId(),
                user.getUsername(),
                resolveDisplayName(user),
                trimText(dto.getContent())));

        return toDto(feedbackRepository.save(feedback));
    }

    /**
     * 分页查询当前用户的反馈工单。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<FeedbackDto> getMyFeedback(Integer userId, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createTime"));
        return feedbackRepository.findByUserUserIdOrderByCreateTimeDesc(userId, pageable).map(this::toDto);
    }

    /**
     * 分页查询全部反馈工单。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<FeedbackDto> getAllFeedback(int page, int size, UserFeedback.FeedbackStatus status) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createTime"));
        if (status == null) {
            return feedbackRepository.findAll(pageable).map(this::toDto);
        }
        return feedbackRepository.findByStatus(status, pageable).map(this::toDto);
    }

    /**
     * 统计反馈工单各状态数量，供后台看板展示。
     */
    @Override
    @Transactional(readOnly = true)
    public List<DashboardBreakdownItemDto> getFeedbackStatusStats() {
        Map<UserFeedback.FeedbackStatus, Long> counts = new EnumMap<>(UserFeedback.FeedbackStatus.class);

        for (Object[] row : feedbackRepository.countGroupedByStatus()) {
            UserFeedback.FeedbackStatus status = (UserFeedback.FeedbackStatus) row[0];
            Long count = (Long) row[1];
            counts.put(status, count);
        }

        return List.of(
                createBreakdownItem("SUBMITTED", "已提交", counts.getOrDefault(UserFeedback.FeedbackStatus.SUBMITTED, 0L)),
                createBreakdownItem("IN_PROGRESS", "处理中", counts.getOrDefault(UserFeedback.FeedbackStatus.IN_PROGRESS, 0L)),
                createBreakdownItem("RESOLVED", "已解决", counts.getOrDefault(UserFeedback.FeedbackStatus.RESOLVED, 0L)),
                createBreakdownItem("REJECTED", "已驳回", counts.getOrDefault(UserFeedback.FeedbackStatus.REJECTED, 0L)));
    }

    /**
     * 管理员回复反馈，并追加一条后台消息记录。
     */
    @Override
    @Transactional
    public FeedbackDto replyFeedback(Long feedbackId, FeedbackReplyDto dto, String adminUsername) {
        UserFeedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found with id: " + feedbackId));

        String trimmedReply = trimText(dto.getReplyContent());
        feedback.addMessage(createMessage(
                UserFeedbackMessage.SenderType.ADMIN,
                null,
                trimNullable(adminUsername),
                trimNullable(adminUsername) == null ? "管理员" : adminUsername.trim(),
                trimmedReply));
        feedback.setAdminReply(trimmedReply);
        feedback.setStatus(dto.getStatus());
        feedback.setHandledBy(trimNullable(adminUsername));
        feedback.setReplyTime(LocalDateTime.now());

        UserFeedback saved = feedbackRepository.save(feedback);
        pushReplyNotification(saved);
        return toDto(saved);
    }

    /**
     * 用户对已有反馈继续补充消息。
     * 若工单已关闭，会重新回到待处理状态。
     */
    @Override
    @Transactional
    public FeedbackDto appendUserMessage(Long feedbackId, Integer userId, FeedbackFollowUpDto dto) {
        UserFeedback feedback = feedbackRepository.findByFeedbackIdAndUserUserId(feedbackId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found with id: " + feedbackId));
        User user = feedback.getUser();

        feedback.addMessage(createMessage(
                UserFeedbackMessage.SenderType.USER,
                user.getUserId(),
                user.getUsername(),
                resolveDisplayName(user),
                trimText(dto.getContent())));

        if (feedback.getStatus() == UserFeedback.FeedbackStatus.RESOLVED
                || feedback.getStatus() == UserFeedback.FeedbackStatus.REJECTED) {
            feedback.setStatus(UserFeedback.FeedbackStatus.SUBMITTED);
        }

        UserFeedback saved = feedbackRepository.save(feedback);
        return toDto(saved);
    }

    /**
     * 向用户推送“反馈已回复”通知。
     */
    private void pushReplyNotification(UserFeedback feedback) {
        Notification notification = new Notification();
        notification.setUser(feedback.getUser());
        notification.setType(Notification.NotificationType.SYSTEM);
        notification.setTitle("反馈已处理");
        notification.setContent("您的反馈《" + feedback.getSubject() + "》已收到回复，请前往反馈页面查看。");
        notification.setIsRead(false);
        notification.setTargetType("FEEDBACK");
        notification.setTargetId(String.valueOf(feedback.getFeedbackId()));
        notification.setRouteHint("/help-feedback");
        notification.setBusinessKey("FEEDBACK_REPLY");
        notificationRepository.save(notification);
    }

    /**
     * 将反馈实体转换为 DTO，并拼装完整消息会话。
     */
    private FeedbackDto toDto(UserFeedback feedback) {
        FeedbackDto dto = new FeedbackDto();
        dto.setFeedbackId(feedback.getFeedbackId());
        dto.setUserId(feedback.getUser().getUserId());
        dto.setUsername(feedback.getUser().getUsername());
        dto.setCategory(feedback.getCategory());
        dto.setSubject(feedback.getSubject());
        dto.setContent(feedback.getContent());
        dto.setContactEmail(feedback.getContactEmail());
        dto.setStatus(feedback.getStatus());
        dto.setAdminReply(feedback.getAdminReply());
        dto.setHandledBy(feedback.getHandledBy());
        dto.setReplyTime(feedback.getReplyTime());
        dto.setCreateTime(feedback.getCreateTime());
        dto.setUpdateTime(feedback.getUpdateTime());
        dto.setMessages(buildMessages(feedback));
        return dto;
    }

    /**
     * 构建反馈消息时间线。
     * 兼容历史字段与新消息表并存的情况，避免旧数据丢失对话内容。
     */
    private List<FeedbackMessageDto> buildMessages(UserFeedback feedback) {
        List<UserFeedbackMessage> storedMessages = feedback.getMessages();
        List<FeedbackMessageDto> fallback = new ArrayList<>();

        if (!containsEquivalentMessage(
                storedMessages,
                UserFeedbackMessage.SenderType.USER,
                feedback.getContent())) {
            fallback.add(createLegacyUserMessage(feedback));
        }

        if (storedMessages != null && !storedMessages.isEmpty()) {
            fallback.addAll(storedMessages.stream()
                    .map(this::toMessageDto)
                    .toList());
        }

        if (feedback.getAdminReply() != null && !feedback.getAdminReply().isBlank()
                && !containsEquivalentMessage(
                        storedMessages,
                        UserFeedbackMessage.SenderType.ADMIN,
                        feedback.getAdminReply())) {
            FeedbackMessageDto reply = new FeedbackMessageDto();
            reply.setSenderType(UserFeedbackMessage.SenderType.ADMIN);
            reply.setSenderName(feedback.getHandledBy() == null ? "管理员" : feedback.getHandledBy());
            reply.setSenderUsername(feedback.getHandledBy());
            reply.setContent(feedback.getAdminReply());
            reply.setCreateTime(feedback.getReplyTime());
            fallback.add(reply);
        }

        fallback.sort((left, right) -> {
            LocalDateTime leftTime = left.getCreateTime();
            LocalDateTime rightTime = right.getCreateTime();

            if (leftTime == null && rightTime == null) {
                return 0;
            }
            if (leftTime == null) {
                return -1;
            }
            if (rightTime == null) {
                return 1;
            }
            return leftTime.compareTo(rightTime);
        });

        return fallback;
    }

    /**
     * 判断消息表中是否已存在等价消息，避免历史字段和消息表重复展示。
     */
    private boolean containsEquivalentMessage(
            List<UserFeedbackMessage> storedMessages,
            UserFeedbackMessage.SenderType senderType,
            String content) {
        if (storedMessages == null || storedMessages.isEmpty() || content == null || content.isBlank()) {
            return false;
        }

        return storedMessages.stream().anyMatch((message) ->
                message.getSenderType() == senderType
                        && content.equals(message.getContent()));
    }

    /**
     * 为历史反馈数据构造一条用户首消息。
     */
    private FeedbackMessageDto createLegacyUserMessage(UserFeedback feedback) {
        FeedbackMessageDto message = new FeedbackMessageDto();
        message.setSenderType(UserFeedbackMessage.SenderType.USER);
        message.setSenderUserId(feedback.getUser().getUserId());
        message.setSenderUsername(feedback.getUser().getUsername());
        message.setSenderName(resolveDisplayName(feedback.getUser()));
        message.setContent(feedback.getContent());
        message.setCreateTime(feedback.getCreateTime());
        return message;
    }

    /**
     * 将反馈消息实体转换为 DTO。
     */
    private FeedbackMessageDto toMessageDto(UserFeedbackMessage message) {
        FeedbackMessageDto dto = new FeedbackMessageDto();
        dto.setMessageId(message.getMessageId());
        dto.setSenderType(message.getSenderType());
        dto.setSenderUserId(message.getSenderUserId());
        dto.setSenderUsername(message.getSenderUsername());
        dto.setSenderName(message.getSenderName());
        dto.setContent(message.getContent());
        dto.setCreateTime(message.getCreateTime());
        return dto;
    }

    /**
     * 构造一条反馈消息实体。
     */
    private UserFeedbackMessage createMessage(
            UserFeedbackMessage.SenderType senderType,
            Integer senderUserId,
            String senderUsername,
            String senderName,
            String content) {
        UserFeedbackMessage message = new UserFeedbackMessage();
        message.setSenderType(senderType);
        message.setSenderUserId(senderUserId);
        message.setSenderUsername(trimNullable(senderUsername));
        message.setSenderName(senderName == null || senderName.isBlank() ? "匿名用户" : senderName.trim());
        message.setContent(content);
        return message;
    }

    /**
     * 推断消息展示用的用户名称。
     */
    private String resolveDisplayName(User user) {
        if (user == null) {
            return "用户";
        }
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName().trim();
        }
        if (user.getUsername() != null && !user.getUsername().isBlank()) {
            return user.getUsername().trim();
        }
        return "用户";
    }

    /**
     * 去除字符串首尾空白，空串返回 null。
     */
    private String trimNullable(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * 去除文本首尾空白，null 时返回空串。
     */
    private String trimText(String value) {
        return value == null ? "" : value.trim();
    }

    /**
     * 构造反馈状态统计项。
     */
    private DashboardBreakdownItemDto createBreakdownItem(String key, String label, Long value) {
        DashboardBreakdownItemDto dto = new DashboardBreakdownItemDto();
        dto.setKey(key);
        dto.setLabel(label);
        dto.setValue(value);
        return dto;
    }
}
