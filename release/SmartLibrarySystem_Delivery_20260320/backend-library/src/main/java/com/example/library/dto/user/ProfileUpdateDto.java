package com.example.library.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * 用户自助更新个人信息的请求 DTO。
 * 不包含 role / status / identityType / password 等敏感字段。
 */
@Data
public class ProfileUpdateDto {

    @Size(max = 100, message = "Full name must be less than 100 characters")
    private String fullName;

    @Email(message = "Email must be valid")
    @Size(max = 100, message = "Email must be less than 100 characters")
    private String email;

    @Size(max = 100, message = "Department must be less than 100 characters")
    private String department;

    @Size(max = 100, message = "Major must be less than 100 characters")
    private String major;

    private Integer enrollmentYear;

    private List<String> interestTags;
}
