package com.example.library.dto;

import com.example.library.entity.ServiceAppointment;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Admin status update request for service appointments.
 */
@Data
public class ServiceAppointmentStatusUpdateDto {

    @NotNull(message = "Status is required")
    private ServiceAppointment.AppointmentStatus status;
}
