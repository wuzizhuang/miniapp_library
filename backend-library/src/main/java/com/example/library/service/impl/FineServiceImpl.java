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
 * 罚款服务实现类。
 * 负责罚款查询、支付、减免以及实体到 DTO 的转换。
 */
@Service
@RequiredArgsConstructor
public class FineServiceImpl implements FineService {

    private final FineRepository fineRepository;

    /**
     * 分页查询指定用户的罚款记录。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<FineDto> getFinesByUser(Integer userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createTime"));
        return fineRepository.findByUserUserId(userId, pageable).map(this::convertToDto);
    }

    /**
     * 分页查询全部罚款记录，支持按状态和关键字筛选。
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
     * 统计系统内待支付罚款总额。
     */
    @Override
    @Transactional(readOnly = true)
    public java.math.BigDecimal getTotalPendingFines() {
        return fineRepository.sumTotalPendingFines();
    }

    /**
     * 根据罚款 ID 查询详情。
     */
    @Override
    @Transactional(readOnly = true)
    public FineDto getFineById(Integer fineId) {
        Fine fine = fineRepository.findById(fineId)
                .orElseThrow(() -> new ResourceNotFoundException("未找到罚款记录，ID: " + fineId));
        return convertToDto(fine);
    }

    /**
     * 减免罚款。
     */
    @Override
    @Transactional
    public FineDto waiveFine(Integer fineId, String waiveReason) {
        Fine fine = fineRepository.findById(fineId)
                .orElseThrow(() -> new ResourceNotFoundException("未找到罚款记录，ID: " + fineId));
        if (fine.getStatus() == Fine.FineStatus.PAID) {
            throw new BadRequestException("该罚款已支付，无法豁免");
        }
        fine.setStatus(Fine.FineStatus.WAIVED);
        fine.setDatePaid(LocalDate.now());
        // 把豁免理由追加到 reason 字段，保留原因审计
        if (waiveReason != null && !waiveReason.isBlank()) {
            String original = fine.getReason() == null ? "" : fine.getReason();
            fine.setReason(original + " [豁免理由] " + waiveReason.trim());
        }
        return convertToDto(fineRepository.save(fine));
    }

    /**
     * 支付罚款。
     */
    @Override
    @Transactional
    public FineDto payFine(Integer fineId) {
        Fine fine = fineRepository.findById(fineId)
                .orElseThrow(() -> new ResourceNotFoundException("未找到罚款记录，ID: " + fineId));
        if (fine.getStatus() == Fine.FineStatus.PAID) {
            throw new BadRequestException("该罚款已支付，无需重复操作");
        }
        if (fine.getStatus() == Fine.FineStatus.WAIVED) {
            throw new BadRequestException("该罚款已豁免");
        }
        fine.setStatus(Fine.FineStatus.PAID);
        fine.setDatePaid(LocalDate.now());
        return convertToDto(fineRepository.save(fine));
    }

    /**
     * 将罚款实体转换为 DTO。
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

    /**
     * 根据借阅状态和罚款原因推断罚款类型，便于前端分类展示。
     */
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
