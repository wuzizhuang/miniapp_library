package com.example.library.controller;

import com.example.library.entity.User;
import com.example.library.repository.*;
import com.example.library.service.DataSeederService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Development-only endpoints for seeding and resetting data.
 */
@Slf4j
@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
@Profile("dev")
public class DevController {

    @Value("${app.admin.password:admin123}")
    private String adminPassword;

    private final UserRepository userRepository;
    private final BookRepository bookRepository;
    private final AuthorRepository authorRepository;
    private final CategoryRepository categoryRepository;
    private final PublisherRepository publisherRepository;
    private final BookCopyRepository bookCopyRepository;
    private final LoanRepository loanRepository;
    private final ReservationRepository reservationRepository;
    private final FineRepository fineRepository;
    private final BookAuthorRepository bookAuthorRepository;
    private final NotificationRepository notificationRepository;
    private final UserBehaviorLogRepository userBehaviorLogRepository;
    private final ServiceAppointmentRepository serviceAppointmentRepository;

    private final PasswordEncoder passwordEncoder;
    private final DataSeederService dataSeederService;

    /**
     * Resets test data and recreates the admin user.
     */
    @PostMapping("/reset-test-data")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> resetTestData() {
        try {
            fineRepository.deleteAll();
            serviceAppointmentRepository.deleteAll();
            notificationRepository.deleteAll();
            userBehaviorLogRepository.deleteAll();

            reservationRepository.deleteAll();
            loanRepository.deleteAll();

            bookCopyRepository.deleteAll();
            bookAuthorRepository.deleteAll();

            bookRepository.deleteAll();
            authorRepository.deleteAll();
            categoryRepository.deleteAll();
            publisherRepository.deleteAll();
            userRepository.deleteAll();

            User adminUser = new User();
            adminUser.setUsername("admin");
            adminUser.setPasswordHash(passwordEncoder.encode(adminPassword));
            adminUser.setEmail("admin@library.com");
            adminUser.setFullName("System Administrator");
            adminUser.setRole(User.UserRole.ADMIN);
            // adminUser.setStatus(User.UserStatus.ACTIVE);
            userRepository.save(adminUser);

            Map<String, String> response = new HashMap<>();
            response.put("message", "测试数据已重置");
            response.put("admin", "用户名: admin");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to reset test data", e);
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "重置数据失败");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Generates randomized seed data for development.
     */
    @PostMapping("/seed")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> seedData(
            @RequestParam(defaultValue = "20") int users,
            @RequestParam(defaultValue = "50") int books) {
        try {
            long start = System.currentTimeMillis();
            dataSeederService.seedFullData(users, books);
            long end = System.currentTimeMillis();
            return ResponseEntity.ok("全量真实业务数据生成成功！耗时: " + (end - start) + "ms");
        } catch (Exception e) {
            log.error("Failed to generate seed data", e);
            return ResponseEntity.internalServerError().body("生成失败: " + e.getMessage());
        }
    }
}
