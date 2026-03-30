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
 * Checks whether the authenticated user owns a fine record.
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

        Optional<Fine> fineOpt = fineRepository.findById(fineId);
        if (fineOpt.isEmpty()) {
            return false;
        }

        return fineOpt.get().getUser().getUserId().equals(userId);
    }
}
