package com.example.library.controller;

import com.example.library.dto.FineDto;
import com.example.library.entity.Fine;
import com.example.library.util.ControllerHelper;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.FineService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 罚款控制器。
 * 负责读者罚款查询、支付、减免以及后台总览接口。
 */
@RestController
@RequestMapping("/api/fines")
@RequiredArgsConstructor
public class FineController {

    private final FineService fineService;

    /**
     * 分页查询当前用户的罚款记录。
     */
    @GetMapping("/me")
    public ResponseEntity<Page<FineDto>> getMyFines(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        UserDetailsImpl authenticatedUser = ControllerHelper.requireAuthenticated(userDetails);

        return ResponseEntity.ok(fineService.getFinesByUser(authenticatedUser.getId(), page, size));
    }

    /**
     * 分页查询全部罚款记录。
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('loan:manage') or hasAuthority('fine:waive')")
    public ResponseEntity<Page<FineDto>> getAllFines(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Fine.FineStatus status,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(fineService.getAllFines(page, size, status, keyword));
    }

    /**
     * 查询系统内当前待支付罚款总额。
     */
    @GetMapping("/pending-total")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('loan:manage') or hasAuthority('fine:waive')")
    public ResponseEntity<java.math.BigDecimal> getPendingTotal() {
        return ResponseEntity.ok(fineService.getTotalPendingFines());
    }

    /**
     * 根据罚款 ID 查询详情。
     */
    @GetMapping("/{fineId}")
    @PreAuthorize("hasRole('ADMIN') or @fineSecurityService.isFineOwner(authentication, #fineId)")
    public ResponseEntity<FineDto> getFineById(@PathVariable Integer fineId) {
        return ResponseEntity.ok(fineService.getFineById(fineId));
    }

    /**
     * 查询指定用户的罚款记录。
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('loan:manage')")
    public ResponseEntity<Page<FineDto>> getFinesByUser(
            @PathVariable Integer userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(fineService.getFinesByUser(userId, page, size));
    }

    /**
     * 支付罚款。
     */
    @PostMapping("/{fineId}/pay")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('loan:manage') or @fineSecurityService.isFineOwner(authentication, #fineId)")
    public ResponseEntity<FineDto> payFine(@PathVariable Integer fineId) {
        return ResponseEntity.ok(fineService.payFine(fineId));
    }

    /**
     * 减免罚款。
     */
    @PostMapping("/{fineId}/waive")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('fine:waive')")
    public ResponseEntity<FineDto> waiveFine(
            @PathVariable Integer fineId,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String waiveReason = body != null ? body.getOrDefault("reason", null) : null;
        return ResponseEntity.ok(fineService.waiveFine(fineId, waiveReason));
    }

}
