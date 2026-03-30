package com.example.library.controller;

import com.example.library.dto.LoanCreateDto;
import com.example.library.dto.LoanDto;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.LoanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

/**
 * 借阅控制器。
 * 负责借书、还书、续借、挂失以及借阅记录查询等接口。
 */
@RestController
@RequestMapping("/api/loans")
@RequiredArgsConstructor
public class LoanController {

    private final LoanService loanService;

    /**
     * 分页查询全部借阅记录。
     * 仅管理员或具备借阅管理权限的账号可调用。
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('loan:manage')")
    public ResponseEntity<Page<LoanDto>> getAllLoans(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "borrowDate") String sortBy,
            @RequestParam(defaultValue = "DESC") String direction,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(loanService.getAllLoans(page, size, sortBy, direction, status));
    }

    /**
     * 查询当前用户仍在借阅中的记录。
     */
    @GetMapping("/my")
    public ResponseEntity<Page<LoanDto>> getMyLoans(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(loanService.getActiveLoans(userDetails.getId(), page, size));
    }

    /**
     * 查询当前用户的借阅历史。
     */
    @GetMapping("/history")
    public ResponseEntity<Page<LoanDto>> getMyHistory(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(loanService.getLoansByUser(userDetails.getId(), page, size));
    }

    /**
     * 根据借阅单 ID 查询详情。
     * 仅管理员或借阅记录所属用户可访问。
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @loanSecurityService.isLoanOwner(authentication, #id)")
    public ResponseEntity<LoanDto> getLoanById(@PathVariable Integer id) {
        return ResponseEntity.ok(loanService.getLoanById(id));
    }

    /**
     * 创建借阅记录。
     * 普通用户只能为自己借书，管理员可代替指定用户办理借阅。
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('loan:write') or hasAuthority('loan:manage')")
    public ResponseEntity<LoanDto> createLoan(
            @Valid @RequestBody LoanCreateDto loanCreateDto,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));

        // 普通用户只能为自己借阅，请求中即使携带 userId 也会被覆盖。
        if (!isAdmin) {
            loanCreateDto.setUserId(userDetails.getId());
        } else if (loanCreateDto.getUserId() == null) {
            // 管理员未显式指定借阅用户时，默认按当前管理员本人处理。
            loanCreateDto.setUserId(userDetails.getId());
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(loanService.createLoan(loanCreateDto));
    }

    /**
     * 办理还书。
     */
    @PutMapping("/{id}/return")
    @PreAuthorize("hasRole('ADMIN') or @loanSecurityService.isLoanOwner(authentication, #id)")
    public ResponseEntity<LoanDto> returnLoan(@PathVariable Integer id) {
        return ResponseEntity.ok(loanService.returnLoan(id));
    }

    /**
     * 办理续借。
     */
    @PutMapping("/{id}/renew")
    @PreAuthorize("hasRole('ADMIN') or @loanSecurityService.isLoanOwner(authentication, #id)")
    public ResponseEntity<LoanDto> renewLoan(@PathVariable Integer id) {
        return ResponseEntity.ok(loanService.renewLoan(id));
    }

    /**
     * 将借阅记录标记为遗失。
     */
    @PutMapping("/{id}/lost")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('loan:manage')")
    public ResponseEntity<LoanDto> markLoanAsLost(@PathVariable Integer id) {
        return ResponseEntity.ok(loanService.markLoanAsLost(id));
    }

    /**
     * 查询逾期借阅记录。
     */
    @GetMapping("/overdue")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('loan:manage')")
    public ResponseEntity<Page<LoanDto>> getOverdueLoans(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(loanService.getOverdueLoans(page, size));
    }
}
