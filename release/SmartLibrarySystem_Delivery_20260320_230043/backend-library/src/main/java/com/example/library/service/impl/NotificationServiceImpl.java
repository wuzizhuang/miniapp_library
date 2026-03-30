package com.example.library.service.impl;

import com.example.library.dto.NotificationDto;
import com.example.library.entity.Loan;
import com.example.library.entity.Notification;
import com.example.library.entity.User;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.LoanRepository;
import com.example.library.repository.NotificationRepository;
import com.example.library.repository.UserRepository;
import com.example.library.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * 通知服务实现类。
 * 负责消息发送、提醒任务、已读维护、删除清理以及通知路由信息推断。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final LoanRepository loanRepository;

    /**
     * 异步发送一条基础通知。
     */
    @Override
    @Async
    public void sendNotification(Integer userId, Notification.NotificationType type, String title, String content) {
        sendNotification(userId, type, title, content, null, null, null, null);
    }

    /**
     * 异步发送一条完整通知，并支持绑定业务对象、前端跳转路由和去重主键。
     */
    @Override
    @Async
    public void sendNotification(
            Integer userId,
            Notification.NotificationType type,
            String title,
            String content,
            String targetType,
            String targetId,
            String routeHint,
            String businessKey) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null)
            return;
        // 先做业务主键去重，避免同一事件被重复通知。
        if (businessKey != null
                && !businessKey.isBlank()
                && notificationRepository.existsByUserUserIdAndBusinessKey(userId, businessKey)) {
            log.info("Skip duplicate notification for user {} with businessKey {}", userId, businessKey);
            return;
        }

        Notification notification = new Notification();
        notification.setUser(user);
        notification.setType(type);
        notification.setTitle(title);
        notification.setContent(content);
        notification.setIsRead(false);
        notification.setTargetType(targetType);
        notification.setTargetId(targetId);
        notification.setRouteHint(routeHint);
        notification.setBusinessKey(businessKey);

        try {
            // 数据库唯一约束作为最后一道兜底，避免并发下产生重复消息。
            notificationRepository.save(notification);
            log.info("Notification sent to User {}: {}", userId, title);
        } catch (DataIntegrityViolationException ex) {
            log.info("Skip duplicate notification race for user {} with businessKey {}", userId, businessKey);
        }
    }

    /**
     * 发送次日到期提醒。
     */
    @Override
    @Transactional
    public void sendDueDateReminders() {
        log.info("Starting due date reminders check...");

        LocalDate tomorrow = LocalDate.now().plusDays(1);
        List<Loan> dueTomorrowLoans = loanRepository.findLoansByDueDate(tomorrow);

        for (Loan loan : dueTomorrowLoans) {
            String title = "还书提醒";
            String content = String.format("您借阅的图书《%s》将于明天 (%s) 到期，请及时归还以避免罚款。",
                    loan.getCopy().getBook().getTitle(),
                    tomorrow.toString());
            String businessKey = "LOAN_DUE_REMINDER:" + loan.getLoanId() + ":" + tomorrow;

            sendNotification(loan.getUser().getUserId(),
                    Notification.NotificationType.DUE_REMINDER,
                    title,
                    content,
                    "LOAN",
                    String.valueOf(loan.getLoanId()),
                    "/my/loan-tracking",
                    businessKey);
        }
        log.info("Sent {} due date reminders.", dueTomorrowLoans.size());
    }

    /**
     * 将单条通知标记为已读，并校验归属人。
     */
    @Override
    @Transactional
    public void markAsRead(Long notificationId, Integer currentUserId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + notificationId));

        if (!notification.getUser().getUserId().equals(currentUserId)) {
            throw new BadRequestException("You can only mark your own notifications as read");
        }

        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    /**
     * 分页查询用户通知。
     */
    @Override
    public Page<NotificationDto> getNotificationsByUser(Integer userId, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "sendTime"));
        return notificationRepository
                .findByUserUserIdOrderBySendTimeDesc(userId, pageRequest)
                .map(this::convertToDto);
    }

    /**
     * 统计用户未读通知数量。
     */
    @Override
    public Long getUnreadCount(Integer userId) {
        return notificationRepository.countByUserUserIdAndIsReadFalse(userId);
    }

    /**
     * 将用户全部通知批量标记为已读。
     */
    @Override
    @Transactional
    public void markAllAsRead(Integer userId) {
        notificationRepository.markAllAsReadForUser(userId);
    }

    /**
     * 将通知实体转换为 DTO，并补齐前端跳转和业务定位信息。
     */
    private NotificationDto convertToDto(Notification notification) {
        NotificationDto dto = new NotificationDto();
        dto.setNotificationId(notification.getNotificationId());
        dto.setType(notification.getType());
        dto.setTitle(notification.getTitle());
        dto.setContent(notification.getContent());
        dto.setIsRead(notification.getIsRead());
        dto.setSendTime(notification.getSendTime());
        dto.setRelatedEntityId(null);
        dto.setTargetType(firstNonBlank(notification.getTargetType(), resolveTargetType(notification)));
        dto.setTargetId(firstNonBlank(notification.getTargetId(), resolveTargetId(notification)));
        dto.setRouteHint(firstNonBlank(notification.getRouteHint(), resolveRouteHint(notification)));
        dto.setBusinessKey(firstNonBlank(notification.getBusinessKey(), resolveBusinessKey(notification)));
        return dto;
    }

    /**
     * 根据通知类型和文案推断目标业务类型。
     */
    private String resolveTargetType(Notification notification) {
        if (notification.getType() == Notification.NotificationType.ARRIVAL_NOTICE) {
            return "RESERVATION";
        }
        if (notification.getType() == Notification.NotificationType.DUE_REMINDER) {
            return "LOAN";
        }
        if (notification.getType() == Notification.NotificationType.NEW_BOOK_RECOMMEND) {
            return "BOOK";
        }

        String title = safeText(notification.getTitle());
        String content = safeText(notification.getContent());
        if (title.contains("罚款") || content.contains("罚款")) {
            return "FINE";
        }
        if (title.contains("预约") || content.contains("预约")) {
            return "RESERVATION";
        }
        if (title.contains("借阅") || content.contains("借阅")) {
            return "LOAN";
        }
        if (title.contains("反馈") || content.contains("反馈")) {
            return "FEEDBACK";
        }

        return null;
    }

    /**
     * 预留目标业务 ID 推断入口。
     * 当前优先使用显式写入的 targetId，后续如有需要可在这里扩展文案解析。
     */
    private String resolveTargetId(Notification notification) {
        return null;
    }

    /**
     * 根据通知类型推断前端默认跳转路由。
     */
    private String resolveRouteHint(Notification notification) {
        if (notification.getType() == Notification.NotificationType.ARRIVAL_NOTICE) {
            return "/my/reservations";
        }
        if (notification.getType() == Notification.NotificationType.DUE_REMINDER) {
            return "/my/loan-tracking";
        }
        if (notification.getType() == Notification.NotificationType.NEW_BOOK_RECOMMEND) {
            return "/books";
        }

        String title = safeText(notification.getTitle());
        String content = safeText(notification.getContent());
        if (title.contains("罚款") || content.contains("罚款")) {
            return "/my/fines";
        }
        if (title.contains("预约") || content.contains("预约")) {
            return "/my/reservations";
        }
        if (title.contains("借阅") || content.contains("借阅")) {
            return "/my/loan-tracking";
        }
        if (title.contains("反馈") || content.contains("反馈")) {
            return "/help-feedback";
        }

        return null;
    }

    /**
     * 根据通知类型或文案推断业务主键前缀。
     */
    private String resolveBusinessKey(Notification notification) {
        if (notification.getType() == Notification.NotificationType.ARRIVAL_NOTICE) {
            return "RESERVATION_ARRIVAL";
        }
        if (notification.getType() == Notification.NotificationType.DUE_REMINDER) {
            return "LOAN_DUE_REMINDER";
        }
        if (notification.getType() == Notification.NotificationType.NEW_BOOK_RECOMMEND) {
            return "BOOK_RECOMMENDATION";
        }

        String title = safeText(notification.getTitle());
        String content = safeText(notification.getContent());
        if (title.contains("罚款") || content.contains("罚款")) {
            return "FINE_NOTICE";
        }
        if (title.contains("预约") || content.contains("预约")) {
            return "RESERVATION_NOTICE";
        }
        if (title.contains("借阅") || content.contains("借阅")) {
            return "LOAN_NOTICE";
        }
        if (title.contains("反馈") || content.contains("反馈")) {
            return "FEEDBACK_REPLY";
        }

        return notification.getType() == null ? null : notification.getType().name();
    }

    /**
     * 统一处理空文本，简化文案解析逻辑。
     */
    private String safeText(String value) {
        return value == null ? "" : value;
    }

    /**
     * 返回第一个非空白字符串。
     */
    private String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary;
        }
        return fallback;
    }

    /**
     * 删除单条通知，并校验用户归属。
     */
    @Override
    @Transactional
    public void deleteNotification(Long notificationId, Integer userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));
        if (!notification.getUser().getUserId().equals(userId)) {
            throw new BadRequestException("You can only delete your own notifications");
        }
        notificationRepository.deleteById(notificationId);
    }

    /**
     * 删除用户全部已读通知。
     */
    @Override
    @Transactional
    public void deleteAllRead(Integer userId) {
        notificationRepository.deleteByUserUserIdAndIsReadTrue(userId);
    }
}
