package com.example.library.service.impl;

import com.example.library.dto.SeatDto;
import com.example.library.dto.SeatReservationCreateDto;
import com.example.library.dto.SeatReservationDto;
import com.example.library.entity.Notification;
import com.example.library.entity.Seat;
import com.example.library.entity.SeatReservation;
import com.example.library.entity.User;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.SeatRepository;
import com.example.library.repository.SeatReservationRepository;
import com.example.library.repository.UserRepository;
import com.example.library.service.NotificationService;
import com.example.library.service.SeatReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * 座位预约服务实现类。
 * 负责座位可用性查询、预约创建、冲突校验、取消预约和通知发送。
 */
@Service
@RequiredArgsConstructor
public class SeatReservationServiceImpl implements SeatReservationService {

    private static final Duration MIN_DURATION = Duration.ofMinutes(30);
    private static final Duration MAX_DURATION = Duration.ofHours(8);
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final SeatRepository seatRepository;
    private final SeatReservationRepository seatReservationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * 查询座位列表，并根据时间窗计算是否可预约。
     */
    @Override
    @Transactional
    public List<SeatDto> getSeats(
            String floorName,
            String zoneName,
            LocalDateTime startTime,
            LocalDateTime endTime,
            boolean availableOnly) {
        validateTimeWindow(startTime, endTime, false);
        refreshCompletedReservations();

        List<Seat> seats = seatRepository.searchSeats(normalizeKeyword(floorName), normalizeKeyword(zoneName));
        Set<Integer> conflictedSeatIds = resolveConflictedSeatIds(startTime, endTime);

        return seats.stream()
                .map(seat -> convertToSeatDto(seat, conflictedSeatIds))
                .filter(dto -> !availableOnly || Boolean.TRUE.equals(dto.getAvailable()))
                .toList();
    }

    /**
     * 创建座位预约。
     * 会校验时间窗、座位状态、座位冲突和用户时间冲突。
     */
    @Override
    @Transactional
    public SeatReservationDto createReservation(Integer userId, SeatReservationCreateDto dto) {
        validateTimeWindow(dto.getStartTime(), dto.getEndTime(), true);
        refreshCompletedReservations();

        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Seat seat = seatRepository.findByIdForUpdate(dto.getSeatId())
                .orElseThrow(() -> new ResourceNotFoundException("Seat not found"));

        List<SeatReservation> exactReservations = seatReservationRepository.findExactActiveReservations(
                userId,
                seat.getSeatId(),
                dto.getStartTime(),
                dto.getEndTime());
        if (!exactReservations.isEmpty()) {
            return convertToReservationDto(exactReservations.get(0));
        }

        if (seat.getStatus() != Seat.SeatStatus.AVAILABLE) {
            throw new BadRequestException("This seat is currently unavailable");
        }

        if (seatReservationRepository.existsSeatConflict(seat.getSeatId(), dto.getStartTime(), dto.getEndTime())) {
            throw new BadRequestException("The selected time slot is already booked for this seat");
        }

        if (seatReservationRepository.existsUserConflict(userId, dto.getStartTime(), dto.getEndTime())) {
            throw new BadRequestException("You already have another seat reservation in this time slot");
        }

        SeatReservation reservation = new SeatReservation();
        reservation.setSeat(seat);
        reservation.setUser(user);
        reservation.setStartTime(dto.getStartTime());
        reservation.setEndTime(dto.getEndTime());
        reservation.setStatus(SeatReservation.ReservationStatus.ACTIVE);
        reservation.setNotes(normalizeNotes(dto.getNotes()));

        SeatReservation savedReservation = seatReservationRepository.save(reservation);
        sendCreationNotification(savedReservation);
        return convertToReservationDto(savedReservation);
    }

    /**
     * 查询当前用户的座位预约记录。
     */
    @Override
    @Transactional
    public List<SeatReservationDto> getMyReservations(Integer userId) {
        refreshCompletedReservations();
        return seatReservationRepository.findByUserUserIdOrderByStartTimeDesc(userId).stream()
                .map(this::convertToReservationDto)
                .toList();
    }

    /**
     * 取消一条座位预约。
     */
    @Override
    @Transactional
    public void cancelReservation(Integer userId, Integer reservationId) {
        refreshCompletedReservations();
        SeatReservation reservation = seatReservationRepository.findByIdForUpdate(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Seat reservation not found"));

        if (!reservation.getUser().getUserId().equals(userId)) {
            throw new BadRequestException("Cannot cancel another user's seat reservation");
        }

        if (reservation.getStatus() == SeatReservation.ReservationStatus.CANCELLED) {
            return;
        }

        if (reservation.getStatus() != SeatReservation.ReservationStatus.ACTIVE) {
            throw new BadRequestException("Only active seat reservations can be cancelled");
        }

        if (!reservation.getStartTime().isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Started or completed reservations cannot be cancelled");
        }

        reservation.setStatus(SeatReservation.ReservationStatus.CANCELLED);
        SeatReservation savedReservation = seatReservationRepository.save(reservation);
        sendCancellationNotification(savedReservation);
    }

    /**
     * 将座位实体转换为列表展示 DTO。
     */
    private SeatDto convertToSeatDto(Seat seat, Set<Integer> conflictedSeatIds) {
        SeatDto dto = new SeatDto();
        dto.setSeatId(seat.getSeatId());
        dto.setSeatCode(seat.getSeatCode());
        dto.setFloorName(seat.getFloorName());
        dto.setFloorOrder(seat.getFloorOrder());
        dto.setZoneName(seat.getZoneName());
        dto.setAreaName(seat.getAreaName());
        dto.setSeatType(seat.getSeatType());
        dto.setStatus(seat.getStatus());
        dto.setHasPower(seat.getHasPower());
        dto.setNearWindow(seat.getNearWindow());
        dto.setDescription(seat.getDescription());
        dto.setAvailable(seat.getStatus() == Seat.SeatStatus.AVAILABLE && !conflictedSeatIds.contains(seat.getSeatId()));
        return dto;
    }

    /**
     * 将座位预约实体转换为 DTO。
     */
    private SeatReservationDto convertToReservationDto(SeatReservation entity) {
        Seat seat = entity.getSeat();
        User user = entity.getUser();

        SeatReservationDto dto = new SeatReservationDto();
        dto.setReservationId(entity.getReservationId());
        dto.setUserId(user != null ? user.getUserId() : null);
        dto.setUsername(user != null ? user.getUsername() : null);
        dto.setUserFullName(user != null ? user.getFullName() : null);
        dto.setSeatId(seat != null ? seat.getSeatId() : null);
        dto.setSeatCode(seat != null ? seat.getSeatCode() : null);
        dto.setFloorName(seat != null ? seat.getFloorName() : null);
        dto.setZoneName(seat != null ? seat.getZoneName() : null);
        dto.setAreaName(seat != null ? seat.getAreaName() : null);
        dto.setSeatType(seat != null ? seat.getSeatType() : null);
        dto.setStartTime(entity.getStartTime());
        dto.setEndTime(entity.getEndTime());
        dto.setStatus(entity.getStatus());
        dto.setNotes(entity.getNotes());
        dto.setCreateTime(entity.getCreateTime());
        dto.setUpdateTime(entity.getUpdateTime());
        return dto;
    }

    /**
     * 校验预约时间窗是否合法。
     * strict=true 时要求开始和结束时间都必须传入。
     */
    private void validateTimeWindow(LocalDateTime startTime, LocalDateTime endTime, boolean strict) {
        if (startTime == null && endTime == null) {
            return;
        }

        if (!strict && (startTime == null || endTime == null)) {
            throw new BadRequestException("Start time and end time must be provided together");
        }

        if (startTime == null || endTime == null) {
            throw new BadRequestException("Seat reservation time window is required");
        }

        if (!endTime.isAfter(startTime)) {
            throw new BadRequestException("End time must be later than start time");
        }

        Duration duration = Duration.between(startTime, endTime);
        if (duration.compareTo(MIN_DURATION) < 0) {
            throw new BadRequestException("Seat reservation must be at least 30 minutes");
        }
        if (duration.compareTo(MAX_DURATION) > 0) {
            throw new BadRequestException("Seat reservation cannot exceed 8 hours");
        }
    }

    /**
     * 查询在指定时间窗内发生冲突的座位 ID 集合。
     */
    private Set<Integer> resolveConflictedSeatIds(LocalDateTime startTime, LocalDateTime endTime) {
        if (startTime == null || endTime == null) {
            return new HashSet<>();
        }

        return new HashSet<>(seatReservationRepository.findConflictedSeatIds(startTime, endTime));
    }

    /**
     * 将已结束的预约状态同步为已完成。
     */
    private void refreshCompletedReservations() {
        seatReservationRepository.markCompletedReservations(LocalDateTime.now());
    }

    /**
     * 规范化楼层、区域等筛选关键字。
     */
    private String normalizeKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }

        String trimmed = keyword.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * 规范化备注字段。
     */
    private String normalizeNotes(String notes) {
        if (notes == null) {
            return null;
        }

        String trimmed = notes.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * 发送座位预约成功通知。
     */
    private void sendCreationNotification(SeatReservation reservation) {
        String content = String.format(
                Locale.ROOT,
                "您已成功预约座位%s，使用时间为%s 至 %s。",
                reservation.getSeat().getSeatCode(),
                reservation.getStartTime().format(TIME_FORMATTER),
                reservation.getEndTime().format(TIME_FORMATTER));

        notificationService.sendNotification(
                reservation.getUser().getUserId(),
                Notification.NotificationType.SYSTEM,
                "座位预约成功",
                content,
                "SEAT_RESERVATION",
                String.valueOf(reservation.getReservationId()),
                "/my/seats",
                buildBusinessKey("SEAT_RESERVATION_CREATED", reservation.getReservationId()));
    }

    /**
     * 发送座位预约取消通知。
     */
    private void sendCancellationNotification(SeatReservation reservation) {
        String content = String.format(
                Locale.ROOT,
                "您已取消座位%s的预约，原时间为%s 至 %s。",
                reservation.getSeat().getSeatCode(),
                reservation.getStartTime().format(TIME_FORMATTER),
                reservation.getEndTime().format(TIME_FORMATTER));

        notificationService.sendNotification(
                reservation.getUser().getUserId(),
                Notification.NotificationType.SYSTEM,
                "座位预约已取消",
                content,
                "SEAT_RESERVATION",
                String.valueOf(reservation.getReservationId()),
                "/my/seats",
                buildBusinessKey("SEAT_RESERVATION_CANCELLED", reservation.getReservationId()));
    }

    /**
     * 构造通知去重业务主键。
     */
    private String buildBusinessKey(String prefix, Integer reservationId) {
        return reservationId == null ? null : prefix + ":" + reservationId;
    }
}
