package com.example.library.controller;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Development-only maintenance endpoints for fixing seed data.
 */
@RestController
@RequestMapping("/api/admin/fix")
@RequiredArgsConstructor
@Profile("dev")
@PreAuthorize("hasRole('ADMIN')")
public class FixTestDataController {

    public static final String MESSAGE = "message";
    @Value("${app.admin.password:admin123}")
    private String adminPassword;
    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    /**
     * Creates an admin user directly via SQL.
     */
    @PostMapping("/direct-create-admin")
    @Transactional
    public ResponseEntity<Map<String, String>> directCreateAdmin() {
        try {
            String sql = "INSERT INTO users (username, password_hash, email, full_name, role, status) " +
                    "VALUES (?, ?, ?, ?, ?, ?)";

            jdbcTemplate.update(sql,
                    "admin",
                    passwordEncoder.encode(adminPassword),
                    "admin@library.com",
                    "System Administrator",
                    "ADMIN",
                    "ACTIVE");

            Map<String, String> response = new HashMap<>();
            response.put(MESSAGE, "管理员用户直接创建成功");
            response.put("admin", "用户名: admin, 密码: admin123");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "创建管理员失败");
            errorResponse.put(MESSAGE, e.getMessage());

            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Normalizes enum values to uppercase in the database.
     */
    @PostMapping("/fix-enum-case")
    @Transactional
    public ResponseEntity<Map<String, String>> fixEnumCase() {
        try {
            int updatedRoles = jdbcTemplate.update(
                    "UPDATE users SET role = UPPER(role) WHERE role IN ('admin', 'user')");

            int updatedStatus = jdbcTemplate.update(
                    "UPDATE users SET status = UPPER(status) WHERE status IN ('active', 'inactive')");

            Map<String, String> response = new HashMap<>();
            response.put(MESSAGE, "枚举值大小写修复成功");
            response.put("updatedRoles", String.valueOf(updatedRoles));
            response.put("updatedStatus", String.valueOf(updatedStatus));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "修复枚举值失败");
            errorResponse.put(MESSAGE, e.getMessage());

            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}
