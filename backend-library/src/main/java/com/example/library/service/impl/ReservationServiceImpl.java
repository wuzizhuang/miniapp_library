package com.example.library.service.impl;

import com.example.library.dto.DashboardBreakdownItemDto;
import com.example.library.dto.ReservationCreateDto;
import com.example.library.dto.ReservationDto;
import com.example.library.entity.*;
import com.example.library.util.NotificationHelper;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.*;
import com.example.library.service.ReservationService;
import com.example.library.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 预约服务实现类。
 * 负责预约创建、排队分配、副本锁定、履约转借阅以及过期释放等流程。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationServiceImpl implements ReservationService {

    private final ReservationRepository reservationRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final BookCopyRepository bookCopyRepository;
    private final NotificationService notificationService;
    private final LoanRepository loanRepository;
    private final FineRepository fineRepository;

    @Value("${library.reservation.pickup-window-days:3}")
    private int pickupWindowDays;
    @Value("${library.loan.max-active-loans:5}")
    private int maxActiveLoans;
    @Value("${library.loan.default-loan-days:14}")
    private int defaultLoanDays;
    @Value("${library.reservation.max-active-reservations:5}")
    private int maxActiveReservations;
    @Value("${library.reservation.expiry-days:14}")
    private int reservationExpiryDays;

    /**
     * 创建预约，并在有可用副本时尝试立即锁定给当前读者。
     */
    @Override
    @Transactional
    public ReservationDto createReservation(ReservationCreateDto createDto) {
        User user = userRepository.findByIdForUpdate(createDto.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("未找到用户"));
        Book book = bookRepository.findById(createDto.getBookId())
                .orElseThrow(() -> new ResourceNotFoundException("未找到图书"));

        if (loanRepository.existsActiveLoanForUserAndBook(user.getUserId(), book.getBookId())) {
            throw new BadRequestException("该用户已有本书的在借记录");
        }

        List<Reservation> existingReservations = reservationRepository.findActiveReservationsByUserAndBook(
                user.getUserId(),
                book.getBookId(),
                PageRequest.of(0, 1));
        // 同一用户对同一本书只保留一条有效预约，重复提交时直接复用已有记录。
        if (!existingReservations.isEmpty()) {
            return convertToDto(existingReservations.get(0));
        }

        Long activeCount = reservationRepository.countActiveReservationsForUser(user.getUserId());
        if (activeCount >= maxActiveReservations) {
            throw new BadRequestException("预约数量已达上限");
        }

        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setBook(book);
        reservation.setReservationDate(LocalDate.now());
        reservation.setExpiryDate(LocalDate.now().plusDays(reservationExpiryDays));
        reservation.setStatus(Reservation.ReservationStatus.PENDING);
        Reservation saved = reservationRepository.save(reservation);

        // 如果当前有空闲副本，则立刻将其锁定给预约人并进入待取书状态。
        List<BookCopy> availableCopies = bookCopyRepository.findAvailableCopiesByBookIdWithLock(
                book.getBookId(),
                PageRequest.of(0, 1));

        if (!availableCopies.isEmpty()) {
            BookCopy copyToLock = availableCopies.get(0);
            lockCopyToReservation(saved, copyToLock);
            saved = reservationRepository.save(saved);
            log.info("Reservation created and immediately locked copy ID: {}", copyToLock.getCopyId());
        } else {
            log.info("No copies available, reservation queued for Book ID: {}", book.getBookId());
        }
        if (saved.getStatus() == Reservation.ReservationStatus.PENDING) {
            notificationService.sendNotification(
                    user.getUserId(),
                    Notification.NotificationType.SYSTEM,
                    "预约成功",
                    String.format("你已成功预约《%s》，当前已进入排队队列。", book.getTitle()),
                    "RESERVATION",
                    saved.getReservationId() == null ? null : String.valueOf(saved.getReservationId()),
                    "/my/reservations",
                    NotificationHelper.buildBusinessKey("RESERVATION_CREATED", saved.getReservationId()));
        }
        return convertToDto(saved);
    }

    /**
     * 取消预约，并在必要时释放或重新分配已锁定的副本。
     */
    @Override
    @Transactional
    public void cancelReservation(Integer reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("未找到预约记录"));

        if (reservation.getStatus() == Reservation.ReservationStatus.FULFILLED ||
                reservation.getStatus() == Reservation.ReservationStatus.EXPIRED) {
            throw new BadRequestException("该预约已完成或已过期，无法取消");
        }

        reservation.setStatus(Reservation.ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        if (reservation.getAllocatedCopy() != null) {
            BookCopy copy = reservation.getAllocatedCopy();

            reservation.setAllocatedCopy(null);

            // 取消后优先把副本转给队列中的下一位读者。
            boolean assignedToNext = allocateInventoryForPendingReservations(copy);

            if (!assignedToNext) {
                copy.setStatus(BookCopy.CopyStatus.AVAILABLE);
                bookCopyRepository.save(copy);
                log.info("Copy {} released to AVAILABLE pool", copy.getCopyId());
            }
        }
    }

    /**
     * 将指定副本分配给最早排队的待处理预约。
     */
    @Override
    @Transactional
    public boolean allocateInventoryForPendingReservations(BookCopy bookCopy) {
        List<Reservation> pendingList = reservationRepository
                .findPendingReservationsForBookWithLock(bookCopy.getBook().getBookId(), PageRequest.of(0, 1));

        if (pendingList.isEmpty()) {
            return false;
        }

        Reservation nextReservation = pendingList.get(0);

        lockCopyToReservation(nextReservation, bookCopy);

        reservationRepository.save(nextReservation);

        log.info("Inventory transferred: Copy {} allocated to User {}", bookCopy.getCopyId(),
                nextReservation.getUser().getUserId());
        return true;
    }

    /**
     * 完成预约履约，将待取书预约正式转换为借阅记录。
     */
    @Override
    @Transactional
    public void fulfillReservation(Integer reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("未找到预约记录"));

        if (reservation.getStatus() != Reservation.ReservationStatus.AWAITING_PICKUP) {
            throw new BadRequestException("仅待取书状态的预约可以履约");
        }
        if (reservation.getAllocatedCopy() == null) {
            throw new BadRequestException("该预约没有已分配的副本可供履约");
        }

        Long pendingFinesCount = fineRepository.countPendingFinesForUser(reservation.getUser().getUserId());
        if (pendingFinesCount > 0) {
            throw new BadRequestException("该用户有未缴罚款，请先缴清后再取书");
        }

        Long activeLoansCount = loanRepository.countActiveLoansForUser(reservation.getUser().getUserId());
        if (activeLoansCount >= maxActiveLoans) {
            throw new BadRequestException("该用户在借数量已达上限（" + maxActiveLoans + "本）");
        }

        // 履约完成后，副本状态从“已预留”切换为“已借出”，并同时生成借阅单。
        BookCopy copy = reservation.getAllocatedCopy();
        copy.setStatus(BookCopy.CopyStatus.BORROWED);
        bookCopyRepository.save(copy);

        Loan loan = new Loan();
        loan.setUser(reservation.getUser());
        loan.setCopy(copy);
        loan.setBorrowDate(LocalDate.now());
        loan.setDueDate(LocalDate.now().plusDays(defaultLoanDays));
        loan.setStatus(Loan.LoanStatus.ACTIVE);
        loanRepository.save(loan);

        reservation.setStatus(Reservation.ReservationStatus.FULFILLED);
        reservation.setPickupDeadline(null);
        reservationRepository.save(reservation);

        notificationService.sendNotification(
                reservation.getUser().getUserId(),
                Notification.NotificationType.SYSTEM,
                "预约取书已完成",
                String.format("你预约的《%s》已完成借阅，应还日期为 %s。",
                        reservation.getBook().getTitle(),
                        loan.getDueDate()),
                "LOAN",
                loan.getLoanId() == null ? null : String.valueOf(loan.getLoanId()),
                "/my/loan-tracking",
                NotificationHelper.buildBusinessKey("RESERVATION_FULFILLED_TO_LOAN", loan.getLoanId()));
    }

    /**
     * 分页查询指定用户的预约记录。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<ReservationDto> getUserReservations(Integer userId, Pageable pageable) {
        return reservationRepository.findByUserUserId(userId, pageable).map(this::convertToDto);
    }

    /**
     * 分页查询预约记录，供后台使用。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<ReservationDto> getAllReservations(Reservation.ReservationStatus status, Pageable pageable) {
        return getAllReservations(status, null, pageable);
    }

    /**
     * 分页查询预约记录，并支持后台关键字筛选。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<ReservationDto> getAllReservations(Reservation.ReservationStatus status, String keyword, Pageable pageable) {
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();
        return reservationRepository.searchForAdmin(status, normalizedKeyword, pageable)
                .map(this::convertToDto);
    }

    /**
     * 统计后台预约列表中各状态的数量分布。
     */
    @Override
    @Transactional(readOnly = true)
    public List<DashboardBreakdownItemDto> getReservationStatusStats(String keyword) {
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();
        Map<Reservation.ReservationStatus, Long> counts = new EnumMap<>(Reservation.ReservationStatus.class);

        for (Object[] row : reservationRepository.countGroupedByStatusForAdmin(normalizedKeyword)) {
            Reservation.ReservationStatus status = (Reservation.ReservationStatus) row[0];
            Long count = (Long) row[1];
            counts.put(status, count);
        }

        return List.of(
                createBreakdownItem("PENDING", "排队中", counts.getOrDefault(Reservation.ReservationStatus.PENDING, 0L)),
                createBreakdownItem(
                        "AWAITING_PICKUP",
                        "待取书",
                        counts.getOrDefault(Reservation.ReservationStatus.AWAITING_PICKUP, 0L)),
                createBreakdownItem(
                        "FULFILLED",
                        "已完成",
                        counts.getOrDefault(Reservation.ReservationStatus.FULFILLED, 0L)),
                createBreakdownItem(
                        "CANCELLED",
                        "已取消",
                        counts.getOrDefault(Reservation.ReservationStatus.CANCELLED, 0L)),
                createBreakdownItem(
                        "EXPIRED",
                        "已过期",
                        counts.getOrDefault(Reservation.ReservationStatus.EXPIRED, 0L)));
    }

    /**
     * 将副本锁定给某条预约，并设置取书截止时间。
     */
    private void lockCopyToReservation(Reservation reservation, BookCopy copy) {
        copy.setStatus(BookCopy.CopyStatus.RESERVED);
        bookCopyRepository.save(copy);

        reservation.setAllocatedCopy(copy);
        reservation.setStatus(Reservation.ReservationStatus.AWAITING_PICKUP);
        reservation.setPickupDeadline(LocalDateTime.now().plusDays(pickupWindowDays));

        reservation.setNotificationSent(true);
        notificationService.sendNotification(
                reservation.getUser().getUserId(),
                Notification.NotificationType.ARRIVAL_NOTICE,
                "预约书籍已可取",
                String.format("你预约的《%s》已为你预留，请在 %s 前到馆取书。",
                        reservation.getBook().getTitle(),
                        reservation.getPickupDeadline().toLocalDate()),
                "RESERVATION",
                reservation.getReservationId() == null ? null : String.valueOf(reservation.getReservationId()),
                "/my/reservations",
                NotificationHelper.buildBusinessKey("RESERVATION_READY_FOR_PICKUP", reservation.getReservationId()));
    }

    /**
     * 扫描超时未取的预约，并释放对应副本。
     */
    @Override
    @Transactional
    public void checkAndExpireReservations() {
        List<Reservation> expiredReservations = reservationRepository
                .findExpiredPickupReservations(LocalDateTime.now());

        for (Reservation reservation : expiredReservations) {
            log.info("Expiring reservation {} for User {}", reservation.getReservationId(),
                    reservation.getUser().getUserId());

            reservation.setStatus(Reservation.ReservationStatus.EXPIRED);

            BookCopy copy = reservation.getAllocatedCopy();
            reservation.setAllocatedCopy(null);

            if (copy != null) {
                // 过期释放后仍优先尝试分配给队列中的下一位读者。
                boolean givenToNext = allocateInventoryForPendingReservations(copy);
                if (!givenToNext) {
                    copy.setStatus(BookCopy.CopyStatus.AVAILABLE);
                    bookCopyRepository.save(copy);
                }
            }
            reservationRepository.save(reservation);
        }
    }

    /**
     * 将预约实体转换为前端使用的 DTO。
     */
    private ReservationDto convertToDto(Reservation r) {
        ReservationDto dto = new ReservationDto();
        dto.setReservationId(r.getReservationId());
        dto.setBookId(r.getBook().getBookId());
        dto.setBookTitle(r.getBook().getTitle());
        dto.setBookIsbn(r.getBook().getIsbn());
        dto.setCoverUrl(r.getBook().getCoverUrl());
        dto.setUserId(r.getUser().getUserId());
        dto.setUsername(r.getUser().getUsername());
        dto.setUserFullName(r.getUser().getFullName());
        dto.setReservationDate(r.getReservationDate());
        dto.setExpiryDate(r.getExpiryDate());
        dto.setStatus(r.getStatus());
        dto.setNotificationSent(r.getNotificationSent());

        if (r.getAllocatedCopy() != null) {
            dto.setAllocatedCopyId(r.getAllocatedCopy().getCopyId());
            dto.setLocationCode(r.getAllocatedCopy().getLocationCode());
        }
        dto.setPickupDeadline(r.getPickupDeadline());
        dto.setQueuePosition(resolveQueuePosition(r));
        return dto;
    }

    /**
     * 计算某条预约在排队队列中的位置。
     * 仅待分配状态的预约需要展示排队序号。
     */
    private Integer resolveQueuePosition(Reservation reservation) {
        if (reservation.getStatus() != Reservation.ReservationStatus.PENDING) {
            return null;
        }

        List<Reservation> queue = reservationRepository.findPendingQueueForBook(reservation.getBook().getBookId());
        for (int i = 0; i < queue.size(); i++) {
            if (queue.get(i).getReservationId().equals(reservation.getReservationId())) {
                return i + 1;
            }
        }

        return null;
    }

    /**
     * 构造后台预约状态统计项。
     */
    private DashboardBreakdownItemDto createBreakdownItem(String key, String label, Long value) {
        DashboardBreakdownItemDto dto = new DashboardBreakdownItemDto();
        dto.setKey(key);
        dto.setLabel(label);
        dto.setValue(value);
        return dto;
    }

}
