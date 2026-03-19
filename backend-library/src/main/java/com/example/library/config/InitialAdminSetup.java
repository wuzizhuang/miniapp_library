package com.example.library.config;

import com.example.library.entity.Permission;
import com.example.library.entity.Role;
import com.example.library.entity.User;
import com.example.library.repository.PermissionRepository;
import com.example.library.repository.RoleRepository;
import com.example.library.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Seeds default users, permissions, and roles at application startup.
 */
@Configuration
@RequiredArgsConstructor
public class InitialAdminSetup {

    private static final Logger logger = LoggerFactory.getLogger(InitialAdminSetup.class);

    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Creates default users, permissions, and the CATALOGER role if missing.
     */
    @Bean
    public CommandLineRunner initializeAdminUser() {
        return args -> {
            // ─── 1. Seed Users ──────────────────────────────────────────
            if (userRepository.findByUsername("admin").isEmpty()) {
                User admin = new User();
                admin.setUsername("admin");
                admin.setPasswordHash(passwordEncoder.encode("admin123"));
                admin.setEmail("admin@library.com");
                admin.setFullName("System Administrator");
                admin.setRole(User.UserRole.ADMIN);
                admin.setStatus(User.UserStatus.ACTIVE);
                userRepository.save(admin);
                logger.info("初始管理员创建成功: admin/admin123");
            }

            if (userRepository.findByUsername("user").isEmpty()) {
                User testUser = new User();
                testUser.setUsername("user");
                testUser.setPasswordHash(passwordEncoder.encode("user123"));
                testUser.setEmail("user@example.com");
                testUser.setFullName("Test User");
                testUser.setRole(User.UserRole.USER);
                testUser.setIdentityType(User.IdentityType.STUDENT);
                testUser.setStatus(User.UserStatus.ACTIVE);
                userRepository.save(testUser);
                logger.info("测试用户创建成功: user/user123");
            }

            if (userRepository.findByUsername("teacher").isEmpty()) {
                User teacherUser = new User();
                teacherUser.setUsername("teacher");
                teacherUser.setPasswordHash(passwordEncoder.encode("teacher123"));
                teacherUser.setEmail("teacher@library.com");
                teacherUser.setFullName("Demo Teacher");
                teacherUser.setRole(User.UserRole.USER);
                teacherUser.setIdentityType(User.IdentityType.TEACHER);
                teacherUser.setStatus(User.UserStatus.ACTIVE);
                userRepository.save(teacherUser);
                logger.info("演示教师创建成功: teacher/teacher123");
            }

            // ─── 2. Seed Permissions ─────────────────────────────────────
            Map<String, String> defaultPermissions = new LinkedHashMap<>();
            defaultPermissions.put("book:read", "查询图书");
            defaultPermissions.put("book:write", "新增/修改图书");
            defaultPermissions.put("book:delete", "删除图书");
            defaultPermissions.put("loan:read", "查询借阅记录");
            defaultPermissions.put("loan:write", "创建/归还借阅");
            defaultPermissions.put("loan:manage", "借阅全量管理（代借/标记丢失/查全量）");
            defaultPermissions.put("fine:waive", "减免罚款");
            defaultPermissions.put("user:manage", "用户管理");
            defaultPermissions.put("review:audit", "审核评论");
            defaultPermissions.put("reservation:manage", "预约管理");
            defaultPermissions.put("appointment:manage", "服务预约管理");
            defaultPermissions.put("report:view", "查看统计报表");
            defaultPermissions.put("catalog:import", "批量导入图书数据");

            for (Map.Entry<String, String> entry : defaultPermissions.entrySet()) {
                if (permissionRepository.findByName(entry.getKey()).isEmpty()) {
                    permissionRepository.save(new Permission(entry.getKey(), entry.getValue()));
                    logger.info("权限创建: {}", entry.getKey());
                }
            }

            // ─── 3. Seed CATALOGER Role ───────────────────────────────────
            upsertRoleWithPermissions(
                    "CATALOGER",
                    "录入员",
                    "负责图书信息录入与维护",
                    List.of("book:read", "book:write", "book:delete", "catalog:import"));

            // ─── 4. Seed LIBRARIAN Role ───────────────────────────────────
            upsertRoleWithPermissions(
                    "LIBRARIAN",
                    "图书管理员",
                    "负责借阅、预约和图书日常管理",
                    List.of(
                            "book:read",
                            "book:write",
                            "book:delete",
                            "loan:read",
                            "loan:write",
                            "loan:manage",
                            "fine:waive",
                            "reservation:manage",
                            "appointment:manage",
                            "report:view"));

            // ─── 5. Seed demo cataloger user ─────────────────────────────
            if (userRepository.findByUsername("cataloger").isEmpty()) {
                Role catalogerRole = roleRepository.findByName("CATALOGER").orElse(null);
                User catalogerUser = new User();
                catalogerUser.setUsername("cataloger");
                catalogerUser.setPasswordHash(passwordEncoder.encode("cat123"));
                catalogerUser.setEmail("cataloger@library.com");
                catalogerUser.setFullName("Demo Cataloger");
                catalogerUser.setRole(User.UserRole.USER); // base enum = USER
                catalogerUser.setIdentityType(User.IdentityType.STAFF);
                catalogerUser.setStatus(User.UserStatus.ACTIVE);
                if (catalogerRole != null) {
                    catalogerUser.getRoles().add(catalogerRole);
                }
                userRepository.save(catalogerUser);
                logger.info("演示录入员创建成功: cataloger/cat123");
            }

            // ─── 6. Seed demo librarian user ──────────────────────────────
            if (userRepository.findByUsername("librarian").isEmpty()) {
                Role librarianRole = roleRepository.findByName("LIBRARIAN").orElse(null);
                User librarianUser = new User();
                librarianUser.setUsername("librarian");
                librarianUser.setPasswordHash(passwordEncoder.encode("lib123"));
                librarianUser.setEmail("librarian@library.com");
                librarianUser.setFullName("Demo Librarian");
                librarianUser.setRole(User.UserRole.USER); // base enum = USER
                librarianUser.setIdentityType(User.IdentityType.STAFF);
                librarianUser.setStatus(User.UserStatus.ACTIVE);
                if (librarianRole != null) {
                    librarianUser.getRoles().add(librarianRole);
                }
                userRepository.save(librarianUser);
                logger.info("演示图书管理员创建成功: librarian/lib123");
            }
        };
    }

    private void upsertRoleWithPermissions(
            String roleName,
            String displayName,
            String description,
            List<String> permissionNames) {
        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> new Role(roleName, displayName, description));

        role.setDisplayName(displayName);
        role.setDescription(description);

        for (String permissionName : permissionNames) {
            permissionRepository.findByName(permissionName)
                    .ifPresent(permission -> role.getPermissions().add(permission));
        }

        roleRepository.save(role);
        logger.info("角色已同步: {}", roleName);
    }
}
