package com.example.library.service;

import com.example.library.dto.ServiceAppointmentCreateDto;
import com.example.library.dto.ServiceAppointmentDto;
import com.example.library.dto.ServiceAppointmentStatusUpdateDto;
import com.example.library.entity.Book;
import com.example.library.entity.BookCopy;
import com.example.library.entity.Loan;
import com.example.library.entity.Notification;
import com.example.library.entity.ServiceAppointment;
import com.example.library.entity.User;
import com.example.library.exception.BadRequestException;
import com.example.library.repository.LoanRepository;
import com.example.library.repository.ServiceAppointmentRepository;
import com.example.library.repository.UserRepository;
import com.example.library.service.impl.ServiceAppointmentServiceImpl;
import com.example.library.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

/**
 * ServiceAppointmentService 单元测试。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ServiceAppointmentService 单元测试")
class ServiceAppointmentServiceImplTest {

    @Mock
    private ServiceAppointmentRepository appointmentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private LoanRepository loanRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private ServiceAppointmentServiceImpl serviceAppointmentService;

    private User user;
    private Book book;
    private BookCopy copy;
    private Loan loan;
    private ServiceAppointment appointment;

    @BeforeEach
    void setUp() {
        user = TestDataFactory.createUser(1, "reader");
        book = TestDataFactory.createBook(10, "Effective Java", "9780134685991");
        copy = TestDataFactory.createAvailableCopy(100, book);
        loan = TestDataFactory.createActiveLoan(88, user, copy);

        appointment = new ServiceAppointment();
        appointment.setAppointmentId(5);
        appointment.setUser(user);
        appointment.setLoan(loan);
        appointment.setServiceType(ServiceAppointment.ServiceType.PICKUP_BOOK);
        appointment.setMethod(ServiceAppointment.ServiceMethod.COUNTER);
        appointment.setStatus(ServiceAppointment.AppointmentStatus.PENDING);
        appointment.setScheduledTime(LocalDateTime.now().plusDays(1));
        appointment.setNotes("window seat");
    }

    @Nested
    @DisplayName("createAppointment — 用户提交预约")
    class CreateAppointment {

        @BeforeEach
        void setUpDuplicateChecks() {
            lenient().when(appointmentRepository.findDuplicatePendingAppointments(
                    eq(1),
                    any(ServiceAppointment.ServiceType.class),
                    any(LocalDateTime.class),
                    any(ServiceAppointment.ServiceMethod.class),
                    any(),
                    any(),
                    any(),
                    any(Pageable.class)))
                    .thenReturn(List.of());
        }

        @Test
        @DisplayName("成功：默认预约方式兜底并发送确认通知")
        void success_sendCreationNotification() {
            ServiceAppointmentCreateDto request = new ServiceAppointmentCreateDto();
            request.setServiceType(ServiceAppointment.ServiceType.CONSULTATION);
            request.setScheduledTime(LocalDateTime.now().plusDays(1));
            request.setMethod(null);
            request.setNotes("  please help  ");

            when(userRepository.findByIdForUpdate(1)).thenReturn(Optional.of(user));
            when(appointmentRepository.save(any(ServiceAppointment.class))).thenAnswer(invocation -> {
                ServiceAppointment saved = invocation.getArgument(0);
                saved.setAppointmentId(20);
                return saved;
            });

            ServiceAppointmentDto result = serviceAppointmentService.createAppointment(1, request);

            assertThat(result.getAppointmentId()).isEqualTo(20);
            assertThat(result.getMethod()).isEqualTo(ServiceAppointment.ServiceMethod.COUNTER);
            assertThat(result.getNotes()).isEqualTo("please help");
            verify(notificationService).sendNotification(
                    eq(1),
                    eq(Notification.NotificationType.SYSTEM),
                    eq("服务预约已提交"),
                    any(String.class),
                    eq("SERVICE_APPOINTMENT"),
                    eq("20"),
                    eq("/my/appointments"),
                    eq("SERVICE_APPOINTMENT_CREATED:20"));
        }

        @Test
        @DisplayName("幂等：相同预约重复提交时返回已有待处理预约")
        void duplicatePendingAppointment_returnsExistingAppointment() {
            ServiceAppointmentCreateDto request = new ServiceAppointmentCreateDto();
            request.setServiceType(ServiceAppointment.ServiceType.CONSULTATION);
            request.setScheduledTime(LocalDateTime.now().plusDays(1));
            request.setMethod(ServiceAppointment.ServiceMethod.COUNTER);
            request.setNotes("please help");

            when(userRepository.findByIdForUpdate(1)).thenReturn(Optional.of(user));
            when(appointmentRepository.findDuplicatePendingAppointments(
                    eq(1),
                    eq(ServiceAppointment.ServiceType.CONSULTATION),
                    eq(request.getScheduledTime()),
                    eq(ServiceAppointment.ServiceMethod.COUNTER),
                    isNull(),
                    isNull(),
                    eq("please help"),
                    any(Pageable.class)))
                    .thenReturn(List.of(appointment));

            ServiceAppointmentDto result = serviceAppointmentService.createAppointment(1, request);

            assertThat(result.getAppointmentId()).isEqualTo(5);
            verify(appointmentRepository, never()).save(any(ServiceAppointment.class));
        }
    }

    @Nested
    @DisplayName("getAllAppointments — 后台查询")
    class GetAllAppointments {

        @Test
        @DisplayName("成功：空关键词归一化为 null")
        void success_blankKeywordNormalized() {
            Pageable pageable = PageRequest.of(0, 10);
            when(appointmentRepository.findAll(pageable))
                    .thenReturn(Page.empty(pageable));

            serviceAppointmentService.getAllAppointments(null, "   ", pageable);

            verify(appointmentRepository).findAll(pageable);
        }

        @Test
        @DisplayName("成功：无关键词且有状态时走状态过滤查询")
        void success_filterByStatusWithoutKeyword() {
            Pageable pageable = PageRequest.of(0, 10);
            when(appointmentRepository.findByStatus(ServiceAppointment.AppointmentStatus.PENDING, pageable))
                    .thenReturn(new PageImpl<>(List.of(appointment)));

            Page<ServiceAppointmentDto> result = serviceAppointmentService.getAllAppointments(
                    ServiceAppointment.AppointmentStatus.PENDING,
                    null,
                    pageable);

            assertThat(result.getContent()).hasSize(1);
            verify(appointmentRepository).findByStatus(ServiceAppointment.AppointmentStatus.PENDING, pageable);
        }

        @Test
        @DisplayName("成功：按状态和关键词查询")
        void success_searchByStatusAndKeyword() {
            Pageable pageable = PageRequest.of(0, 10);
            when(appointmentRepository.searchForAdmin(ServiceAppointment.AppointmentStatus.PENDING, "reader", pageable))
                    .thenReturn(new PageImpl<>(List.of(appointment)));

            Page<ServiceAppointmentDto> result = serviceAppointmentService.getAllAppointments(
                    ServiceAppointment.AppointmentStatus.PENDING,
                    "reader",
                    pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getAppointmentId()).isEqualTo(5);
            verify(appointmentRepository).searchForAdmin(ServiceAppointment.AppointmentStatus.PENDING, "reader", pageable);
        }

        @Test
        @DisplayName("成功：关联图书缺失时仍返回预约记录")
        void success_handlesMissingBookRelation() {
            Pageable pageable = PageRequest.of(0, 10);
            appointment.getLoan().setCopy(null);
            when(appointmentRepository.findAll(pageable))
                    .thenReturn(new PageImpl<>(List.of(appointment)));

            Page<ServiceAppointmentDto> result = serviceAppointmentService.getAllAppointments(null, null, pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getLoanId()).isEqualTo(88);
            assertThat(result.getContent().get(0).getBookTitle()).isNull();
        }
    }

    @Nested
    @DisplayName("cancelAppointment — 用户取消预约")
    class CancelAppointment {

        @Test
        @DisplayName("成功：取消待处理预约并发送通知")
        void success_cancelPendingAppointment() {
            when(appointmentRepository.findById(5)).thenReturn(Optional.of(appointment));
            when(appointmentRepository.save(any(ServiceAppointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

            serviceAppointmentService.cancelAppointment(1, 5);

            assertThat(appointment.getStatus()).isEqualTo(ServiceAppointment.AppointmentStatus.CANCELLED);
            verify(notificationService).sendNotification(
                    eq(1),
                    eq(Notification.NotificationType.SYSTEM),
                    eq("服务预约已取消"),
                    any(String.class),
                    eq("SERVICE_APPOINTMENT"),
                    eq("5"),
                    eq("/my/appointments"),
                    eq("SERVICE_APPOINTMENT_CANCELLED_BY_USER:5"));
        }
    }

    @Nested
    @DisplayName("updateAppointmentStatus — 后台流转")
    class UpdateAppointmentStatus {

        @Test
        @DisplayName("成功：PENDING 可更新为 COMPLETED，并发送站内通知")
        void success_pendingToCompleted() {
            ServiceAppointmentStatusUpdateDto request = new ServiceAppointmentStatusUpdateDto();
            request.setStatus(ServiceAppointment.AppointmentStatus.COMPLETED);

            when(appointmentRepository.findById(5)).thenReturn(Optional.of(appointment));
            when(appointmentRepository.save(any(ServiceAppointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

            ServiceAppointmentDto result = serviceAppointmentService.updateAppointmentStatus(5, request);

            assertThat(result.getStatus()).isEqualTo(ServiceAppointment.AppointmentStatus.COMPLETED);
            verify(notificationService).sendNotification(
                    eq(1),
                    eq(Notification.NotificationType.SYSTEM),
                    eq("服务预约已完成"),
                    any(String.class),
                    eq("SERVICE_APPOINTMENT"),
                    eq("5"),
                    eq("/my/appointments"),
                    eq("SERVICE_APPOINTMENT_COMPLETED:5"));
        }

        @Test
        @DisplayName("成功：相同状态请求幂等返回，不重复发通知")
        void success_sameStatusIsIdempotent() {
            ServiceAppointmentStatusUpdateDto request = new ServiceAppointmentStatusUpdateDto();
            request.setStatus(ServiceAppointment.AppointmentStatus.PENDING);

            when(appointmentRepository.findById(5)).thenReturn(Optional.of(appointment));

            ServiceAppointmentDto result = serviceAppointmentService.updateAppointmentStatus(5, request);

            assertThat(result.getStatus()).isEqualTo(ServiceAppointment.AppointmentStatus.PENDING);
            verify(appointmentRepository, never()).save(any(ServiceAppointment.class));
            verify(notificationService, never()).sendNotification(
                    any(),
                    any(),
                    any(),
                    any(),
                    any(),
                    any(),
                    any(),
                    any());
        }

        @Test
        @DisplayName("失败：非 PENDING 预约不能改成其他状态")
        void fail_nonPendingCannotBeProcessedAgain() {
            ServiceAppointmentStatusUpdateDto request = new ServiceAppointmentStatusUpdateDto();
            request.setStatus(ServiceAppointment.AppointmentStatus.MISSED);
            appointment.setStatus(ServiceAppointment.AppointmentStatus.COMPLETED);

            when(appointmentRepository.findById(5)).thenReturn(Optional.of(appointment));

            assertThatThrownBy(() -> serviceAppointmentService.updateAppointmentStatus(5, request))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Only pending appointments");

            verify(notificationService, never()).sendNotification(
                    any(),
                    any(),
                    any(),
                    any(),
                    any(),
                    any(),
                    any(),
                    any());
        }
    }
}
