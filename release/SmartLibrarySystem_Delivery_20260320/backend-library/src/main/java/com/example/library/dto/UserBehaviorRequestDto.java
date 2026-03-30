package com.example.library.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * User behavior tracking request DTO.
 */
@Data
public class UserBehaviorRequestDto {
    @NotNull(message = "图书ID不能为空")
    private Long bookId;

    @NotBlank(message = "行为类型不能为空")
    private String actionType;

    private Integer durationSeconds;
    private String deviceType;
}
