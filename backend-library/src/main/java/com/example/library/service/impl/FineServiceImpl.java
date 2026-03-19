package com.example.library.service.impl;

import com.example.library.dto.FineDto;
import com.example.library.entity.Book;
import com.example.library.entity.BookCopy;
import com.example.library.entity.Fine;
import com.example.library.entity.Loan;
import com.example.library.entity.User;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.FineRepository;
import com.example.library.service.FineService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Default fine service implementation.
 */
@Service
@RequiredArgsConstructor
public class FineServiceImpl implements FineService {

    private final FineRepository fineRepository;

    /**
     * Returns paged fines for a user.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<FineDto> getFinesByUser(Integer userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createTime"));
        return fineRepository.findByUserUserId(userId, pageable).map(this::convertToDto);
    }

    /**
     * Returns all fines paged (admin).
     */
    @Override
    @Transactional(readOnly = true)
    public Page<FineDto> getAllFines(int page, int size, Fine.FineStatus status, String keyword) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createTime"));
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();
        Page<Fine> fines;

        if (status == null && normalizedKeyword == null) {
            fines = fineRepository.findAll(pageable);
        } else if (normalizedKeyword == null) {
            fines = fineRepository.findByStatus(status, pageable);
        } else {
            fines = fineRepository.searchForAdmin(status, normalizedKeyword, pageable);
        }

        return fines.map(this::convertToDto);
    }

    /**
     * Returns the total unpaid amount across the system.
     */
    @Override
    @Transactional(readOnly = true)
    public java.math.BigDecimal getTotalPendingFines() {
        return fineRepository.sumTotalPendingFines();
    }

    /**
     * Returns a single fine by ID.
     */
    @Override
    @Transactional(readOnly = true)
    public FineDto getFineById(Integer fineId) {
        Fine fine = fineRepository.findById(fineId)
                .orElseThrow(() -> new ResourceNotFoundException("Fine not found with id: " + fineId));
        return convertToDto(fine);
    }

    /**
     * Waives a fine (admin only) — sets status to WAIVED.
     */
    @Override
    @Transactional
    public FineDto waiveFine(Integer fineId) {
        Fine fine = fineRepository.findById(fineId)
                .orElseThrow(() -> new ResourceNotFoundException("Fine not found with id: " + fineId));
        if (fine.getStatus() == Fine.FineStatus.PAID) {
            throw new BadRequestException("Cannot waive a fine that has already been paid.");
        }
        fine.setStatus(Fine.FineStatus.WAIVED);
        fine.setDatePaid(LocalDate.now());
        return convertToDto(fineRepository.save(fine));
    }

    /**
     * Pays a fine if it is unpaid.
     */
    @Override
    @Transactional
    public FineDto payFine(Integer fineId) {
        Fine fine = fineRepository.findById(fineId)
                .orElseThrow(() -> new ResourceNotFoundException("Fine not found with id: " + fineId));
        if (fine.getStatus() == Fine.FineStatus.PAID) {
            throw new BadRequestException("This fine has already been paid.");
        }
        if (fine.getStatus() == Fine.FineStatus.WAIVED) {
            throw new BadRequestException("This fine has been waived.");
        }
        fine.setStatus(Fine.FineStatus.PAID);
        fine.setDatePaid(LocalDate.now());
        return convertToDto(fineRepository.save(fine));
    }

    /**
     * Maps entity to DTO.
     */
    private FineDto convertToDto(Fine fine) {
        Loan loan = fine.getLoan();
        BookCopy copy = loan != null ? loan.getCopy() : null;
        Book book = copy != null ? copy.getBook() : null;
        User user = fine.getUser();

        FineDto dto = new FineDto();
        dto.setFineId(fine.getFineId());
        dto.setLoanId(loan != null ? loan.getLoanId() : null);
        dto.setBookTitle(book != null ? book.getTitle() : null);
        dto.setUserId(user != null ? user.getUserId() : null);
        dto.setUsername(user != null ? user.getUsername() : null);
        dto.setUserFullName(user != null ? user.getFullName() : null);
        dto.setAmount(fine.getAmount());
        dto.setType(resolveType(fine));
        dto.setReason(fine.getReason());
        dto.setDateIssued(fine.getDateIssued());
        dto.setDatePaid(fine.getDatePaid());
        dto.setStatus(fine.getStatus());
        return dto;
    }

    private String resolveType(Fine fine) {
        if (fine.getLoan() != null && fine.getLoan().getStatus() == Loan.LoanStatus.LOST) {
            return "LOST";
        }

        String reason = fine.getReason() == null ? "" : fine.getReason().toLowerCase();
        if (reason.contains("damage") || reason.contains("damaged") || reason.contains("损坏")) {
            return "DAMAGE";
        }

        return "OVERDUE";
    }
}
