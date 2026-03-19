package com.example.library.dto.user;

import com.example.library.entity.User;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Request payload for admin-only user identity changes.
 */
@Data
public class AdminUserIdentityUpdateDto {

    @NotNull
    private User.IdentityType identityType;
}
