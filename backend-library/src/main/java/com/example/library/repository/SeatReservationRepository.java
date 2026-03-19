package com.example.library.repository;

import com.example.library.entity.SeatReservation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Seat reservation repository.
 */
@Repository
public interface SeatReservationRepository extends JpaRepository<SeatReservation, Integer> {

    /**
     * Returns current user's reservations ordered by newest time window first.
     */
    List<SeatReservation> findByUserUserIdOrderByStartTimeDesc(Integer userId);

    /**
     * Returns conflicted seat ids in a time window.
     */
    @Query("""
            SELECT DISTINCT sr.seat.seatId
            FROM SeatReservation sr
            WHERE sr.status = 'ACTIVE'
              AND sr.startTime < :endTime
              AND sr.endTime > :startTime
            """)
    List<Integer> findConflictedSeatIds(@Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);

    /**
     * Checks whether the target seat is already reserved in the requested window.
     */
    @Query("""
            SELECT CASE WHEN COUNT(sr) > 0 THEN TRUE ELSE FALSE END
            FROM SeatReservation sr
            WHERE sr.seat.seatId = :seatId
              AND sr.status = 'ACTIVE'
              AND sr.startTime < :endTime
              AND sr.endTime > :startTime
            """)
    boolean existsSeatConflict(
            @Param("seatId") Integer seatId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);

    /**
     * Checks whether the reader already has another active reservation in the same window.
     */
    @Query("""
            SELECT CASE WHEN COUNT(sr) > 0 THEN TRUE ELSE FALSE END
            FROM SeatReservation sr
            WHERE sr.user.userId = :userId
              AND sr.status = 'ACTIVE'
              AND sr.startTime < :endTime
              AND sr.endTime > :startTime
            """)
    boolean existsUserConflict(
            @Param("userId") Integer userId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);

    @Query("""
            SELECT sr
            FROM SeatReservation sr
            WHERE sr.user.userId = :userId
              AND sr.seat.seatId = :seatId
              AND sr.status = 'ACTIVE'
              AND sr.startTime = :startTime
              AND sr.endTime = :endTime
            ORDER BY sr.reservationId DESC
            """)
    List<SeatReservation> findExactActiveReservations(
            @Param("userId") Integer userId,
            @Param("seatId") Integer seatId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);

    /**
     * Marks expired active reservations as completed when their reserved window has ended.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE SeatReservation sr
            SET sr.status = 'COMPLETED'
            WHERE sr.status = 'ACTIVE'
              AND sr.endTime <= :now
            """)
    int markCompletedReservations(@Param("now") LocalDateTime now);

    /**
     * Loads a reservation with a write lock before status changes.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT sr FROM SeatReservation sr WHERE sr.reservationId = :reservationId")
    Optional<SeatReservation> findByIdForUpdate(@Param("reservationId") Integer reservationId);
}
