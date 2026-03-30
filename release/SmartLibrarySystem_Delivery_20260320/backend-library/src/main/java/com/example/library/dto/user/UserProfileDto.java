package com.example.library.dto.user;

import com.example.library.entity.User;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 用户完整个人信息 DTO，用于前端个人设置页面。
 */
@Data
public class UserProfileDto {
    private Integer userId;
    private String username;
    private String email;
    private String fullName;
    private User.UserRole role;
    private User.UserStatus status;
    private String department;
    private String major;
    private User.IdentityType identityType;
    private Integer enrollmentYear;
    private List<String> interestTags;
    private List<String> roles = new ArrayList<>();
    private List<String> permissions = new ArrayList<>();
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
