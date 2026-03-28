package com.example.library.service.impl;

import com.example.library.entity.Loan;
import com.example.library.repository.LoanRepository;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.LoanSecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * 借阅数据权限服务。
 * 用于校验当前登录用户是否可以访问某条借阅记录。
 */
@Service
@RequiredArgsConstructor
public class LoanSecurityServiceImpl implements LoanSecurityService {
    private final LoanRepository loanRepository;

    /**
     * 判断当前用户是否拥有指定借阅记录。
     */
    @Override
    public boolean isLoanOwner(Authentication authentication, Integer loanId) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof UserDetailsImpl)) {
            return false;
        }

        UserDetailsImpl userDetails = (UserDetailsImpl) principal;
        Integer userId = userDetails.getId();

        // 通过借阅记录的 user_id 做最终归属校验。
        Optional<Loan> loanOpt = loanRepository.findById(loanId);
        if (loanOpt.isEmpty()) {
            return false;
        }

        return loanOpt.get().getUser().getUserId().equals(userId);
    }
}
