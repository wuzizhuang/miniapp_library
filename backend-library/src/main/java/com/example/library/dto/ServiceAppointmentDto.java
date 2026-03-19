package com.example.library.dto;

import com.example.library.entity.ServiceAppointment.AppointmentStatus;
import com.example.library.entity.ServiceAppointment.ServiceMethod;
import com.example.library.entity.ServiceAppointment.ServiceType;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Service appointment response DTO.
 */
@Data
public class ServiceAppointmentDto {
    private Integer appointmentId;
    private Integer userId;
    private String username;
    private String userFullName;
    private Integer loanId;
    private String bookTitle;

    private ServiceType serviceType;
    private ServiceMethod method;
    private AppointmentStatus status;

    private LocalDateTime scheduledTime;
    private String returnLocation;
    private String notes;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
