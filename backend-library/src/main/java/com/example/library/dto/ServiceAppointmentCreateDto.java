package com.example.library.dto;

import com.example.library.entity.ServiceAppointment.ServiceMethod;
import com.example.library.entity.ServiceAppointment.ServiceType;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Service appointment request DTO.
 */
@Data
public class ServiceAppointmentCreateDto {

    @NotNull(message = "Service type is required")
    private ServiceType serviceType;

    @NotNull(message = "Scheduled time is required")
    @Future(message = "Appointment time must be in the future")
    private LocalDateTime scheduledTime;

    private ServiceMethod method = ServiceMethod.COUNTER;

    private Integer loanId;

    private String returnLocation;

    private String notes;
}
