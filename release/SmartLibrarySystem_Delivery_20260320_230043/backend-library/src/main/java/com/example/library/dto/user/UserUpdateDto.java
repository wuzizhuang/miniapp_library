package com.example.library.dto.user;

import com.example.library.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * User update request DTO.
 */
@Data
public class UserUpdateDto {
    @Size(max = 100, message = "Full name must be less than 100 characters")
    private String fullName;

    @Email(message = "Email must be valid")
    @Size(max = 100, message = "Email must be less than 100 characters")
    private String email;

    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    private String oldPassword;

    private User.UserRole role;
    private User.UserStatus status;
}
