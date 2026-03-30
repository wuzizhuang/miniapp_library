package com.example.library.service;

import com.example.library.dto.DashboardBreakdownItemDto;
import com.example.library.dto.ServiceAppointmentCreateDto;
import com.example.library.dto.ServiceAppointmentDto;
import com.example.library.dto.ServiceAppointmentStatusUpdateDto;
import com.example.library.entity.ServiceAppointment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * Service appointment scheduling service.
 */
public interface ServiceAppointmentService {
    /**
     * Creates a service appointment.
     */
    ServiceAppointmentDto createAppointment(Integer userId, ServiceAppointmentCreateDto dto);

    /**
     * Returns appointments for a user.
     */
    Page<ServiceAppointmentDto> getMyAppointments(Integer userId, Pageable pageable);

    /**
     * Cancels an appointment.
     */
    void cancelAppointment(Integer userId, Integer appointmentId);

    /**
     * Returns all appointments for admin operations.
     */
    Page<ServiceAppointmentDto> getAllAppointments(
            ServiceAppointment.AppointmentStatus status,
            String keyword,
            Pageable pageable);

    /**
     * Returns grouped admin appointment counts by status.
     */
    List<DashboardBreakdownItemDto> getAppointmentStatusStats(String keyword);

    /**
     * Updates appointment status from the admin workflow.
     */
    ServiceAppointmentDto updateAppointmentStatus(Integer appointmentId, ServiceAppointmentStatusUpdateDto dto);
}
