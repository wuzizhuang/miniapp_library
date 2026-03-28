package com.example.library.service.impl;

import com.example.library.dto.LoanCreateDto;
import com.example.library.dto.LoanDto;
import com.example.library.entity.*;
import com.example.library.util.NotificationHelper;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.*;
import com.example.library.service.LoanService;
import com.example.library.service.NotificationService;
import com.example.library.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 借阅服务实现类。
 * 封装借书、还书、续借、遗失登记、逾期检查等核心借阅业务规则。
 */
@Service
@RequiredArgsConstructor
public class LoanServiceImpl implements LoanService {

    private final LoanRepository loanRepository;
    private final UserRepository userRepository;
    private final BookCopyRepository bookCopyRepository;
    private final FineRepository fineRepository;
    private final ReservationRepository reservationRepository;
    private final ReservationService reservationService;
    private final NotificationService notificationService;
    private static final Logger log = LoggerFactory.getLogger(LoanServiceImpl.class);

    @Value("${library.loan.max-active-loans:5}")
    private int maxActiveLoans;

    @Value("${library.loan.default-loan-days:14}")
    private int defaultLoanDays;

    @Value("${library.loan.max-renewals:2}")
    private int maxRenewals = 2;

    @Value("${library.loan.fine-per-day:1.00}")
    private BigDecimal finePerDay;

    /**
     * 分页查询借阅记录。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<LoanDto> getAllLoans(int page, int size, String sortBy, String direction, String status) {
        Sort.Direction sortDirection = direction.equalsIgnoreCase("DESC") ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sortBy));
        if (status != null && !status.isBlank()) {
            try {
                Loan.LoanStatus loanStatus = Loan.LoanStatus.valueOf(status.toUpperCase());
                return loanRepository.findByStatus(loanStatus, pageable).map(this::convertToDto);
            } catch (IllegalArgumentException ignored) {
                // 非法枚举值则忽略过滤条件，返回全部
            }
        }
        return loanRepository.findAll(pageable).map(this::convertToDto);
    }

    /**
     * 分页查询指定用户的借阅记录。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<LoanDto> getLoansByUser(Integer userId, int page, int size) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("未找到用户，ID: " + userId);
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "borrowDate"));
        return loanRepository.findByUserUserId(userId, pageable).map(this::convertToDto);
    }

    /**
     * 分页查询指定用户当前仍在借阅中的记录。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<LoanDto> getActiveLoans(Integer userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "borrowDate"));
        return loanRepository.findByUserUserIdAndStatusIn(userId,
                List.of(Loan.LoanStatus.ACTIVE, Loan.LoanStatus.OVERDUE), pageable)
                .map(this::convertToDto);
    }

    /**
     * 根据借阅单 ID 查询详情。
     */
    @Override
    @Transactional(readOnly = true)
    public LoanDto getLoanById(Integer loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("未找到借阅记录，ID: " + loanId));
        return convertToDto(loan);
    }

    /**
     * 创建借阅记录。
     * 会串联校验图书状态、副本状态、用户欠费、预约队列以及最大借阅数量限制。
     */
    @Override
    @Transactional
    public LoanDto createLoan(LoanCreateDto loanCreateDto) {
        User user = userRepository.findByIdForUpdate(loanCreateDto.getUserId())
                .orElseThrow(
                        () -> new ResourceNotFoundException("未找到用户，ID: " + loanCreateDto.getUserId()));

        String confirmUsername = loanCreateDto.getConfirmUsername();
        if (confirmUsername != null
                && !confirmUsername.isBlank()
                && !user.getUsername().equalsIgnoreCase(confirmUsername.trim())) {
            throw new BadRequestException("复核账号与目标读者不一致，请重新确认读者 ID");
        }

        BookCopy bookCopy = bookCopyRepository.findByCopyIdWithLock(loanCreateDto.getCopyId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "未找到图书副本，ID: " + loanCreateDto.getCopyId()));

        if (bookCopy.getBook().getStatus() == Book.BookStatus.INACTIVE) {
            throw new BadRequestException("该图书已下架，无法借阅");
        }

        if (bookCopy.getStatus() != BookCopy.CopyStatus.AVAILABLE) {
            throw new BadRequestException("该副本当前不可借阅");
        }

        Long pendingFinesCount = fineRepository.countPendingFinesForUser(user.getUserId());
        if (pendingFinesCount > 0) {
            throw new BadRequestException("该用户有未缴罚款，请先缴清后再借阅");
        }

        Integer bookId = bookCopy.getBook().getBookId();
        if (loanRepository.existsActiveLoanForUserAndBook(user.getUserId(), bookId)) {
            throw new BadRequestException("该用户已有本书的在借记录，不可重复借阅");
        }

        // 若该书存在预约队列，则只有排在最前面的用户才能优先借走当前副本。
        List<Reservation> pendingReservations = reservationRepository.findPendingReservationsForBook(bookId);
        if (!pendingReservations.isEmpty()) {
            Reservation firstReservation = pendingReservations.get(0);
            if (!firstReservation.getUser().getUserId().equals(user.getUserId())) {
                throw new BadRequestException("此书已被其他用户预约，请等待可借副本或稍后重试");
            }
            firstReservation.setStatus(Reservation.ReservationStatus.FULFILLED);
            reservationRepository.save(firstReservation);
        }

        // 借阅落单前再次校验用户当前在借数量，避免超出系统上限。
        Long activeLoansCount = loanRepository.countActiveLoansForUser(user.getUserId());
        if (activeLoansCount >= maxActiveLoans) {
            throw new BadRequestException("该用户在借数量已达上限（" + maxActiveLoans + "本），无法继续借阅");
        }

        Loan loan = new Loan();
        loan.setUser(user);
        loan.setCopy(bookCopy);
        loan.setBorrowDate(LocalDate.now());
        loan.setDueDate(LocalDate.now().plusDays(defaultLoanDays));
        loan.setStatus(Loan.LoanStatus.ACTIVE);
        loan.setRenewalCount(0);

        bookCopy.setStatus(BookCopy.CopyStatus.BORROWED);
        bookCopyRepository.save(bookCopy);

        Loan savedLoan = loanRepository.save(loan);
        notificationService.sendNotification(
                user.getUserId(),
                Notification.NotificationType.SYSTEM,
                "借阅成功",
                String.format("你已成功借阅《%s》，应还日期为 %s。",
                        bookCopy.getBook().getTitle(),
                        savedLoan.getDueDate()),
                "LOAN",
                String.valueOf(savedLoan.getLoanId()),
                "/my/loan-tracking",
                NotificationHelper.buildBusinessKey("LOAN_BORROW_SUCCESS", savedLoan.getLoanId()));
        return convertToDto(savedLoan);
    }

    /**
     * 办理还书，并在逾期时自动生成罚款。
     */
    @Override
    @Transactional
    public LoanDto returnLoan(Integer loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("未找到借阅记录，ID: " + loanId));

        if (loan.getStatus() != Loan.LoanStatus.ACTIVE && loan.getStatus() != Loan.LoanStatus.OVERDUE) {
            throw new BadRequestException("该借阅记录已归还或已标记遗失");
        }

        loan.setReturnDate(LocalDate.now());
        loan.setStatus(Loan.LoanStatus.RETURNED);

        BookCopy bookCopy = loan.getCopy();

        // 归还后优先尝试把副本分配给排队中的预约用户，减少人工干预。
        boolean allocatedToReservation = reservationService.allocateInventoryForPendingReservations(bookCopy);

        if (allocatedToReservation) {
            log.info("Book returned and immediately allocated to pending reservation.");
        } else {
            bookCopy.setStatus(BookCopy.CopyStatus.AVAILABLE);
        }

        bookCopyRepository.save(bookCopy);

        // 超过应还日期则自动生成逾期罚款，并通知用户处理。
        if (loan.getDueDate().isBefore(LocalDate.now())) {
            long daysLate = ChronoUnit.DAYS.between(loan.getDueDate(), LocalDate.now());
            BigDecimal fineAmount = finePerDay.multiply(BigDecimal.valueOf(daysLate));

            Fine fine = new Fine();
            fine.setLoan(loan);
            fine.setUser(loan.getUser());
            fine.setAmount(fineAmount);
            fine.setReason("逾期归还：超期 " + daysLate + " 天");
            fine.setDateIssued(LocalDate.now());
            fine.setStatus(Fine.FineStatus.PENDING);
            fineRepository.save(fine);
            notificationService.sendNotification(
                    loan.getUser().getUserId(),
                    Notification.NotificationType.SYSTEM,
                    "逾期罚款已生成",
                String.format("《%s》逾期归还，已生成罚款 %s 元。",
                        bookCopy.getBook().getTitle(),
                        fineAmount),
                "FINE",
                fine.getFineId() == null ? null : String.valueOf(fine.getFineId()),
                "/my/fines",
                NotificationHelper.buildBusinessKey("FINE_OVERDUE_CREATED", fine.getFineId()));
        }

        Loan updatedLoan = loanRepository.save(loan);
        return convertToDto(updatedLoan);
    }

    /**
     * 续借当前借阅记录。
     * 仅正常借阅中的记录可以续借，且需要满足未逾期、未超次数、无待缴罚款、无他人排队等条件。
     */
    @Override
    @Transactional
    public LoanDto renewLoan(Integer loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("未找到借阅记录，ID: " + loanId));

        if (loan.getStatus() != Loan.LoanStatus.ACTIVE) {
            throw new BadRequestException("仅借阅中的记录可以续借");
        }

        if (loan.getDueDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("已逾期的借阅记录不可续借");
        }

        if (loan.getRenewalCount() != null && loan.getRenewalCount() >= maxRenewals) {
            throw new BadRequestException("该借阅记录已达续借次数上限");
        }

        Long pendingFinesCount = fineRepository.countPendingFinesForUser(loan.getUser().getUserId());
        if (pendingFinesCount > 0) {
            throw new BadRequestException("该用户有未缴罚款，请先缴清后再续借");
        }
        // 若其他读者已经在排队预约该书，则不允许继续占用副本。
        if (reservationRepository.existsConflictingActiveReservationForBook(
                loan.getCopy().getBook().getBookId(),
                loan.getUser().getUserId())) {
            throw new BadRequestException("其他读者正在排队预约此书，暂不允许续借");
        }

        loan.setDueDate(LocalDate.now().plusDays(defaultLoanDays));
        loan.setRenewalCount((loan.getRenewalCount() == null ? 0 : loan.getRenewalCount()) + 1);

        Loan updatedLoan = loanRepository.save(loan);
        return convertToDto(updatedLoan);
    }

    /**
     * 将借阅记录标记为遗失，并按副本价格生成赔偿罚款。
     */
    @Override
    @Transactional
    public LoanDto markLoanAsLost(Integer loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResourceNotFoundException("未找到借阅记录，ID: " + loanId));

        if (loan.getStatus() != Loan.LoanStatus.ACTIVE && loan.getStatus() != Loan.LoanStatus.OVERDUE) {
            throw new BadRequestException("该借阅记录已归还或已标记遗失");
        }

        loan.setStatus(Loan.LoanStatus.LOST);

        BookCopy bookCopy = loan.getCopy();
        bookCopy.setStatus(BookCopy.CopyStatus.LOST);
        bookCopyRepository.save(bookCopy);

        Fine fine = new Fine();
        fine.setLoan(loan);
        fine.setUser(loan.getUser());
        fine.setAmount(bookCopy.getPrice());
        fine.setReason("图书遗失：" + bookCopy.getBook().getTitle());
        fine.setDateIssued(LocalDate.now());
        fine.setStatus(Fine.FineStatus.PENDING);
        fineRepository.save(fine);
        notificationService.sendNotification(
                loan.getUser().getUserId(),
                Notification.NotificationType.SYSTEM,
                "图书遗失已登记",
                String.format("《%s》已标记为遗失，并生成赔付金额 %s 元。",
                        bookCopy.getBook().getTitle(),
                        bookCopy.getPrice()),
                "FINE",
                fine.getFineId() == null ? null : String.valueOf(fine.getFineId()),
                "/my/fines",
                NotificationHelper.buildBusinessKey("FINE_LOST_CREATED", fine.getFineId()));

        Loan updatedLoan = loanRepository.save(loan);
        return convertToDto(updatedLoan);
    }

    /**
     * 扫描逾期借阅，并将其状态更新为逾期。
     */
    @Override
    @Transactional
    public List<LoanDto> checkForOverdueLoans() {
        List<Loan> overdueLoans = loanRepository.findOverdueLoans(LocalDate.now());

        // 将数据库中的借阅状态同步为 OVERDUE，便于前后台统一识别。
        overdueLoans.forEach(loan -> loan.setStatus(Loan.LoanStatus.OVERDUE));
        loanRepository.saveAll(overdueLoans);

        return overdueLoans.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * 分页查询已经标记为逾期的借阅记录。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<LoanDto> getOverdueLoans(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "dueDate"));
        return loanRepository.findByStatus(Loan.LoanStatus.OVERDUE, pageable)
                .map(this::convertToDto);
    }

    /**
     * 将借阅实体转换为前端使用的 DTO。
     */
    private LoanDto convertToDto(Loan loan) {
        LoanDto dto = new LoanDto();
        dto.setLoanId(loan.getLoanId());

        BookCopy copy = loan.getCopy();
        Book book = copy.getBook();

        dto.setCopyId(copy.getCopyId());
        dto.setBookId(book.getBookId());
        dto.setBookTitle(book.getTitle());
        dto.setBookIsbn(book.getIsbn());
        dto.setBookCoverUrl(book.getCoverUrl());
        dto.setLocationCode(copy.getLocationCode());

        // 作者信息按逗号拼接，便于前端直接展示。
        if (book.getBookAuthors() != null && !book.getBookAuthors().isEmpty()) {
            String authorNames = book.getBookAuthors().stream()
                    .map(ba -> ba.getAuthor().getName())
                    .collect(Collectors.joining(", "));
            dto.setBookAuthorNames(authorNames);
        }

        // 分类名做平铺输出，避免前端再次展开实体关系。
        if (book.getCategory() != null) {
            dto.setCategoryName(book.getCategory().getName());
        }

        dto.setUserId(loan.getUser().getUserId());
        dto.setUsername(loan.getUser().getUsername());
        dto.setUserFullName(loan.getUser().getFullName());

        dto.setBorrowDate(loan.getBorrowDate());
        dto.setDueDate(loan.getDueDate());
        dto.setReturnDate(loan.getReturnDate());
        dto.setStatus(loan.getStatus());

        dto.setCreateTime(loan.getCreateTime());
        dto.setUpdateTime(loan.getUpdateTime());

        // 对未归还记录补充剩余天数或逾期天数，方便页面直接展示。
        if (loan.getStatus() == Loan.LoanStatus.ACTIVE || loan.getStatus() == Loan.LoanStatus.OVERDUE) {
            long daysUntilDue = ChronoUnit.DAYS.between(LocalDate.now(), loan.getDueDate());
            if (daysUntilDue < 0) {
                dto.setDaysOverdue(Math.abs(daysUntilDue));
                dto.setDaysRemaining(0L);
            } else {
                dto.setDaysRemaining(daysUntilDue);
            }
        }

        dto.setRenewalCount(loan.getRenewalCount() == null ? 0 : loan.getRenewalCount());

        return dto;
    }

}
