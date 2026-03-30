package com.example.library.service;

import com.example.library.entity.Notification;
import com.example.library.entity.Loan;
import com.example.library.entity.Book;
import com.example.library.entity.BookCopy;
import com.example.library.entity.User;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.LoanRepository;
import com.example.library.repository.NotificationRepository;
import com.example.library.repository.UserRepository;
import com.example.library.service.impl.NotificationServiceImpl;
import com.example.library.support.TestDataFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.List;
import java.time.LocalDate;

import static org.mockito.ArgumentMatchers.any;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationService 单元测试")
class NotificationServiceImplTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private LoanRepository loanRepository;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    @Nested
    @DisplayName("deleteNotification")
    class DeleteNotification {

        @Test
        @DisplayName("成功：当前用户可以删除自己的通知")
        void deleteOwnNotification() {
            Notification notification = createNotification(100L, 1);
            when(notificationRepository.findById(100L)).thenReturn(Optional.of(notification));

            notificationService.deleteNotification(100L, 1);

            verify(notificationRepository).deleteById(100L);
        }

        @Test
        @DisplayName("失败：不能删除他人的通知")
        void rejectDeletingAnotherUsersNotification() {
            Notification notification = createNotification(100L, 2);
            when(notificationRepository.findById(100L)).thenReturn(Optional.of(notification));

            assertThatThrownBy(() -> notificationService.deleteNotification(100L, 1))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("own notifications");

            verify(notificationRepository, never()).deleteById(anyLong());
        }

        @Test
        @DisplayName("失败：通知不存在时抛出 ResourceNotFoundException")
        void throwWhenNotificationNotFound() {
            when(notificationRepository.findById(404L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> notificationService.deleteNotification(404L, 1))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("404");

            verify(notificationRepository, never()).deleteById(anyLong());
        }
    }

    @Test
    @DisplayName("deleteAllRead：只按当前用户执行已读清理")
    void deleteAllReadForCurrentUser() {
        notificationService.deleteAllRead(1);

        verify(notificationRepository).deleteByUserUserIdAndIsReadTrue(1);
        verify(notificationRepository, never()).deleteByUserUserIdAndIsReadTrue(2);
    }

    @Test
    @DisplayName("sendNotification：相同 businessKey 不重复创建通知")
    void skipDuplicateBusinessKey() {
        User user = TestDataFactory.createUser(1, "alice");
        when(userRepository.findById(1)).thenReturn(Optional.of(user));
        when(notificationRepository.existsByUserUserIdAndBusinessKey(1, "DUPLICATE_KEY")).thenReturn(true);

        notificationService.sendNotification(
                1,
                Notification.NotificationType.SYSTEM,
                "系统通知",
                "内容",
                "LOAN",
                "10",
                "/my/loan-tracking",
                "DUPLICATE_KEY");

        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    @DisplayName("sendDueDateReminders：为到期借阅生成带幂等键的提醒")
    void sendDueDateReminders_createsReminderWithBusinessKey() {
        User user = TestDataFactory.createUser(1, "alice");
        Book book = TestDataFactory.createBook(10, "Effective Java", "978-0-13-468599-1");
        BookCopy copy = TestDataFactory.createAvailableCopy(100, book);
        Loan loan = TestDataFactory.createActiveLoan(5, user, copy);
        loan.setDueDate(LocalDate.now().plusDays(1));

        when(loanRepository.findLoansByDueDate(LocalDate.now().plusDays(1))).thenReturn(List.of(loan));
        when(userRepository.findById(1)).thenReturn(Optional.of(user));
        when(notificationRepository.existsByUserUserIdAndBusinessKey(1, "LOAN_DUE_REMINDER:5:" + LocalDate.now().plusDays(1)))
                .thenReturn(false);

        notificationService.sendDueDateReminders();

        verify(notificationRepository).save(any(Notification.class));
    }

    private Notification createNotification(Long notificationId, Integer userId) {
        User user = TestDataFactory.createUser(userId, "user" + userId);
        Notification notification = new Notification();
        notification.setNotificationId(notificationId);
        notification.setUser(user);
        notification.setType(Notification.NotificationType.SYSTEM);
        notification.setTitle("系统通知");
        notification.setContent("测试通知");
        notification.setIsRead(false);
        return notification;
    }
}
