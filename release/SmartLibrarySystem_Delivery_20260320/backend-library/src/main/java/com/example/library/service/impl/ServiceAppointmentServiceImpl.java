package com.example.library.service.impl;

import com.example.library.dto.DashboardBreakdownItemDto;
import com.example.library.dto.ServiceAppointmentCreateDto;
import com.example.library.dto.ServiceAppointmentDto;
import com.example.library.dto.ServiceAppointmentStatusUpdateDto;
import com.example.library.entity.*;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.*;
import com.example.library.service.LoanService;
import com.example.library.service.NotificationService;
import com.example.library.service.ServiceAppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Default service appointment implementation.
 */
@Service
@RequiredArgsConstructor
public class ServiceAppointmentServiceImpl implements ServiceAppointmentService {

    private final ServiceAppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final LoanRepository loanRepository;
    private final NotificationService notificationService;
    private final LoanService loanService;

    /**
     * Creates a service appointment.
     */
    @Override
    @Transactional
    public ServiceAppointmentDto createAppointment(Integer userId, ServiceAppointmentCreateDto dto) {
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        ServiceAppointment.ServiceMethod normalizedMethod =
                dto.getMethod() == null ? ServiceAppointment.ServiceMethod.COUNTER : dto.getMethod();
        String normalizedNotes = normalizeNotes(dto.getNotes());
        String normalizedReturnLocation = normalizeNotes(dto.getReturnLocation());

        ServiceAppointment appointment = new ServiceAppointment();
        appointment.setUser(user);
        appointment.setServiceType(dto.getServiceType());
        appointment.setScheduledTime(dto.getScheduledTime());
        appointment.setMethod(normalizedMethod);
        appointment.setNotes(normalizedNotes);
        appointment.setReturnLocation(normalizedReturnLocation);
        appointment.setStatus(ServiceAppointment.AppointmentStatus.PENDING);

        if (dto.getLoanId() != null) {
            Loan loan = loanRepository.findById(dto.getLoanId())
                    .orElseThrow(() -> new ResourceNotFoundException("Loan not found"));
            if (!loan.getUser().getUserId().equals(userId)) {
                throw new BadRequestException("Cannot create appointment for other user's loan");
            }
            if (dto.getServiceType() == ServiceAppointment.ServiceType.RETURN_BOOK) {
                if (loan.getStatus() != Loan.LoanStatus.ACTIVE && loan.getStatus() != Loan.LoanStatus.OVERDUE) {
                    throw new BadRequestException("Only active or overdue loans can submit a return request");
                }
                if (appointment.getReturnLocation() == null) {
                    throw new BadRequestException("Return location is required for return-book appointments");
                }
                if (appointmentRepository.existsByLoanLoanIdAndServiceTypeAndStatus(
                        loan.getLoanId(),
                        ServiceAppointment.ServiceType.RETURN_BOOK,
                        ServiceAppointment.AppointmentStatus.PENDING)) {
                    return appointmentRepository
                            .findFirstByLoanLoanIdAndServiceTypeAndStatusOrderByAppointmentIdDesc(
                                    loan.getLoanId(),
                                    ServiceAppointment.ServiceType.RETURN_BOOK,
                                    ServiceAppointment.AppointmentStatus.PENDING)
                            .map(this::convertToDto)
                            .orElseThrow(() -> new BadRequestException("A pending return review already exists for this loan"));
                }
            }
            appointment.setLoan(loan);
        } else if (dto.getServiceType() == ServiceAppointment.ServiceType.RETURN_BOOK) {
            throw new BadRequestException("Return-book appointments must be linked to a loan");
        }

        List<ServiceAppointment> duplicateAppointments = appointmentRepository.findDuplicatePendingAppointments(
                userId,
                appointment.getServiceType(),
                appointment.getScheduledTime(),
                appointment.getMethod(),
                dto.getLoanId(),
                appointment.getReturnLocation(),
                appointment.getNotes(),
                PageRequest.of(0, 1));
        if (!duplicateAppointments.isEmpty()) {
            return convertToDto(duplicateAppointments.get(0));
        }

        ServiceAppointment savedAppointment = appointmentRepository.save(appointment);
        sendCreationNotification(savedAppointment);

        return convertToDto(savedAppointment);
    }

    /**
     * Returns appointments for a user.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<ServiceAppointmentDto> getMyAppointments(Integer userId, Pageable pageable) {
        return appointmentRepository.findByUserUserId(userId, pageable)
                .map(this::convertToDto);
    }

    /**
     * Cancels a service appointment.
     */
    @Override
    @Transactional
    public void cancelAppointment(Integer userId, Integer appointmentId) {
        ServiceAppointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));

        if (!appointment.getUser().getUserId().equals(userId)) {
            throw new BadRequestException("Cannot cancel another user's appointment");
        }

        if (appointment.getStatus() == ServiceAppointment.AppointmentStatus.COMPLETED) {
            throw new BadRequestException("Cannot cancel completed appointment");
        }

        if (appointment.getStatus() == ServiceAppointment.AppointmentStatus.CANCELLED) {
            return;
        }
        appointment.setStatus(ServiceAppointment.AppointmentStatus.CANCELLED);
        ServiceAppointment savedAppointment = appointmentRepository.save(appointment);
        sendCancellationNotification(savedAppointment);
    }

    /**
     * Returns appointments for admin workflow.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<ServiceAppointmentDto> getAllAppointments(
            ServiceAppointment.AppointmentStatus status,
            String keyword,
            Pageable pageable) {
        String normalizedKeyword = normalizeKeyword(keyword);
        Page<ServiceAppointment> appointments;

        if (normalizedKeyword == null) {
            appointments = status == null
                    ? appointmentRepository.findAll(pageable)
                    : appointmentRepository.findByStatus(status, pageable);
        } else {
            appointments = appointmentRepository.searchForAdmin(status, normalizedKeyword, pageable);
        }

        return appointments.map(this::convertToDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DashboardBreakdownItemDto> getAppointmentStatusStats(String keyword) {
        String normalizedKeyword = normalizeKeyword(keyword);
        Map<ServiceAppointment.AppointmentStatus, Long> counts = new EnumMap<>(ServiceAppointment.AppointmentStatus.class);

        for (Object[] row : appointmentRepository.countGroupedByStatusForAdmin(normalizedKeyword)) {
            ServiceAppointment.AppointmentStatus status = (ServiceAppointment.AppointmentStatus) row[0];
            Long count = (Long) row[1];
            counts.put(status, count);
        }

        return List.of(
                createBreakdownItem("PENDING", "待处理", counts.getOrDefault(ServiceAppointment.AppointmentStatus.PENDING, 0L)),
                createBreakdownItem(
                        "COMPLETED",
                        "已完成",
                        counts.getOrDefault(ServiceAppointment.AppointmentStatus.COMPLETED, 0L)),
                createBreakdownItem(
                        "MISSED",
                        "已失约",
                        counts.getOrDefault(ServiceAppointment.AppointmentStatus.MISSED, 0L)),
                createBreakdownItem(
                        "CANCELLED",
                        "已取消",
                        counts.getOrDefault(ServiceAppointment.AppointmentStatus.CANCELLED, 0L)));
    }

    /**
     * Updates appointment status from admin workflow.
     */
    @Override
    @Transactional
    public ServiceAppointmentDto updateAppointmentStatus(Integer appointmentId, ServiceAppointmentStatusUpdateDto dto) {
        ServiceAppointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));

        ServiceAppointment.AppointmentStatus requestedStatus = dto.getStatus();
        ServiceAppointment.AppointmentStatus currentStatus = appointment.getStatus();

        if (requestedStatus == null) {
            throw new BadRequestException("Appointment status is required");
        }

        if (requestedStatus == currentStatus) {
            return convertToDto(appointment);
        }

        if (currentStatus != ServiceAppointment.AppointmentStatus.PENDING) {
            throw new BadRequestException("Only pending appointments can be processed from the admin workflow");
        }

        if (requestedStatus == ServiceAppointment.AppointmentStatus.PENDING) {
            throw new BadRequestException("Appointment is already pending");
        }

        if (appointment.getServiceType() == ServiceAppointment.ServiceType.RETURN_BOOK
                && requestedStatus == ServiceAppointment.AppointmentStatus.COMPLETED) {
            Loan loan = appointment.getLoan();
            if (loan == null) {
                throw new BadRequestException("Return review is missing linked loan information");
            }
            loanService.returnLoan(loan.getLoanId());
        }

        appointment.setStatus(requestedStatus);
        ServiceAppointment savedAppointment = appointmentRepository.save(appointment);
        sendStatusNotification(savedAppointment);

        return convertToDto(savedAppointment);
    }

    /**
     * Maps entity to DTO.
     */
    private ServiceAppointmentDto convertToDto(ServiceAppointment entity) {
        User user = entity.getUser();
        Loan loan = entity.getLoan();
        BookCopy copy = loan != null ? loan.getCopy() : null;
        Book book = copy != null ? copy.getBook() : null;

        ServiceAppointmentDto dto = new ServiceAppointmentDto();
        dto.setAppointmentId(entity.getAppointmentId());
        dto.setUserId(user != null ? user.getUserId() : null);
        dto.setUsername(user != null ? user.getUsername() : null);
        dto.setUserFullName(user != null ? user.getFullName() : null);
        if (loan != null) {
            dto.setLoanId(loan.getLoanId());
            dto.setBookTitle(book != null ? book.getTitle() : null);
        }
        dto.setServiceType(entity.getServiceType());
        dto.setMethod(entity.getMethod());
        dto.setStatus(entity.getStatus());
        dto.setScheduledTime(entity.getScheduledTime());
        dto.setReturnLocation(entity.getReturnLocation());
        dto.setNotes(entity.getNotes());
        dto.setCreateTime(entity.getCreateTime());
        dto.setUpdateTime(entity.getUpdateTime());
        return dto;
    }

    private void sendStatusNotification(ServiceAppointment appointment) {
        String title = switch (appointment.getStatus()) {
            case COMPLETED -> "服务预约已完成";
            case CANCELLED -> "服务预约已取消";
            case MISSED -> "服务预约已失约";
            default -> "服务预约状态已更新";
        };
        String content = String.format(
                Locale.ROOT,
                "您预约的%s（%s）状态已更新为%s%s。",
                describeServiceType(appointment.getServiceType()),
                appointment.getScheduledTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")),
                describeStatus(appointment.getStatus()),
                appointment.getReturnLocation() == null ? "" : "，地点：" + appointment.getReturnLocation());

        notificationService.sendNotification(
                appointment.getUser().getUserId(),
                Notification.NotificationType.SYSTEM,
                title,
                content,
                "SERVICE_APPOINTMENT",
                String.valueOf(appointment.getAppointmentId()),
                "/my/appointments",
                buildBusinessKey("SERVICE_APPOINTMENT_" + appointment.getStatus().name(), appointment.getAppointmentId()));
    }

    private void sendCreationNotification(ServiceAppointment appointment) {
        String content = String.format(
                Locale.ROOT,
                "您已成功提交%s预约，预约时间为%s%s。",
                describeServiceType(appointment.getServiceType()),
                appointment.getScheduledTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")),
                appointment.getReturnLocation() == null ? "" : "，归还地点为" + appointment.getReturnLocation());

        notificationService.sendNotification(
                appointment.getUser().getUserId(),
                Notification.NotificationType.SYSTEM,
                "服务预约已提交",
                content,
                "SERVICE_APPOINTMENT",
                String.valueOf(appointment.getAppointmentId()),
                "/my/appointments",
                buildBusinessKey("SERVICE_APPOINTMENT_CREATED", appointment.getAppointmentId()));
    }

    private void sendCancellationNotification(ServiceAppointment appointment) {
        String content = String.format(
                Locale.ROOT,
                "您已取消%s预约，原预约时间为%s%s。",
                describeServiceType(appointment.getServiceType()),
                appointment.getScheduledTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")),
                appointment.getReturnLocation() == null ? "" : "，原地点为" + appointment.getReturnLocation());

        notificationService.sendNotification(
                appointment.getUser().getUserId(),
                Notification.NotificationType.SYSTEM,
                "服务预约已取消",
                content,
                "SERVICE_APPOINTMENT",
                String.valueOf(appointment.getAppointmentId()),
                "/my/appointments",
                buildBusinessKey("SERVICE_APPOINTMENT_CANCELLED_BY_USER", appointment.getAppointmentId()));
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }

        String trimmed = keyword.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeNotes(String notes) {
        if (notes == null) {
            return null;
        }

        String trimmed = notes.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String describeServiceType(ServiceAppointment.ServiceType serviceType) {
        return switch (serviceType) {
            case RETURN_BOOK -> "到馆还书";
            case PICKUP_BOOK -> "预约取书";
            case CONSULTATION -> "馆员咨询";
        };
    }

    private String describeStatus(ServiceAppointment.AppointmentStatus status) {
        return switch (status) {
            case PENDING -> "待处理";
            case COMPLETED -> "已完成";
            case CANCELLED -> "已取消";
            case MISSED -> "已失约";
        };
    }

    private DashboardBreakdownItemDto createBreakdownItem(String key, String label, Long value) {
        DashboardBreakdownItemDto dto = new DashboardBreakdownItemDto();
        dto.setKey(key);
        dto.setLabel(label);
        dto.setValue(value);
        return dto;
    }

    private String buildBusinessKey(String prefix, Integer appointmentId) {
        return appointmentId == null ? null : prefix + ":" + appointmentId;
    }
}
