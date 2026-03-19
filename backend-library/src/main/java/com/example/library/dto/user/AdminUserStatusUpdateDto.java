package com.example.library.dto.user;

import com.example.library.entity.User;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Request payload for admin-only user status changes.
 */
@Data
public class AdminUserStatusUpdateDto {

    @NotNull
    private User.UserStatus status;
}
