package com.example.library.dto.user;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * User login request DTO.
 */
@Data
public class UserLoginDto {
    @NotBlank(message = "Username is required")
    private String username;

    @NotBlank(message = "Password is required")
    private String password;
}
