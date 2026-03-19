package com.example.library.dto.auth;

import com.example.library.entity.User;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Auth context returned to frontend for RBAC-aware UI rendering.
 */
@Data
public class AuthContextDto {
    private Integer userId;
    private String username;
    private String email;
    private String fullName;
    private String role;
    private User.UserStatus status;
    private List<String> roles = new ArrayList<>();
    private List<String> permissions = new ArrayList<>();
}
