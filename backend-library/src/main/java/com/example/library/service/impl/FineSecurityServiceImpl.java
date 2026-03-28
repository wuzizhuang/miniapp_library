package com.example.library.service.impl;

import com.example.library.entity.Fine;
import com.example.library.repository.FineRepository;
import com.example.library.security.UserDetailsImpl;
import com.example.library.service.FineSecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * 罚款数据权限服务。
 * 用于校验当前登录用户是否拥有指定罚款记录。
 */
@Service
@RequiredArgsConstructor
public class FineSecurityServiceImpl implements FineSecurityService {
    private final FineRepository fineRepository;

    @Override
    public boolean isFineOwner(Authentication authentication, Integer fineId) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof UserDetailsImpl)) {
            return false;
        }

        UserDetailsImpl userDetails = (UserDetailsImpl) principal;
        Integer userId = userDetails.getId();

        // 对象级权限判断必须回表确认归属关系，避免仅凭请求参数放行。
        Optional<Fine> fineOpt = fineRepository.findById(fineId);
        if (fineOpt.isEmpty()) {
            return false;
        }

        return fineOpt.get().getUser().getUserId().equals(userId);
    }
}
