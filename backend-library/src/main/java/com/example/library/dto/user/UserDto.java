package com.example.library.dto.user;

import com.example.library.entity.User;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * User response DTO.
 */
@Data
public class UserDto {
    private Integer userId;
    private String username;
    private String email;
    private String fullName;
    private User.UserRole role;
    private User.UserStatus status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private List<String> roles = new ArrayList<>();
    private List<String> permissions = new ArrayList<>();

    private String department;
    private String major;
    private User.IdentityType identityType;
    private Integer enrollmentYear;
    private List<String> interestsTag;
}
