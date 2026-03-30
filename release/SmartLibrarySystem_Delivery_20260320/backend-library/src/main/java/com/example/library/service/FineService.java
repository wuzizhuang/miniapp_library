package com.example.library.service;

import com.example.library.dto.FineDto;
import com.example.library.entity.Fine;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;

/**
 * Fine service.
 */
public interface FineService {
    /**
     * Returns paged fines for a user.
     */
    Page<FineDto> getFinesByUser(Integer userId, int page, int size);

    /**
     * Returns all fines paged (admin).
     */
    Page<FineDto> getAllFines(int page, int size, Fine.FineStatus status, String keyword);

    /**
     * Returns the total unpaid amount across the system.
     */
    BigDecimal getTotalPendingFines();

    /**
     * Returns a single fine by ID.
     */
    FineDto getFineById(Integer fineId);

    /**
     * Waives a fine (admin only).
     */
    FineDto waiveFine(Integer fineId);

    /**
     * Pays a fine.
     */
    FineDto payFine(Integer fineId);
}
