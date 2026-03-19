package com.example.library.repository;

import com.example.library.entity.Reservation;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * Repository for reservation queries.
 */
@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Integer> {

    /**
     * Returns paged reservations for a user.
     */
    Page<Reservation> findByUserUserId(Integer userId, Pageable pageable);

    /**
     * Returns paged reservations for admin.
     */
    Page<Reservation> findAllByOrderByReservationDateDescReservationIdDesc(Pageable pageable);

    /**
     * Returns paged reservations for admin by status.
     */
    Page<Reservation> findByStatusOrderByReservationDateDescReservationIdDesc(
            Reservation.ReservationStatus status,
            Pageable pageable);

    /**
     * Returns paged reservations for admin by status and keyword.
     */
    @Query("""
            SELECT r FROM Reservation r
            WHERE (:status IS NULL OR r.status = :status)
              AND (
                    :keyword IS NULL
                    OR LOWER(r.book.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(r.book.isbn) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(r.user.username) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(r.user.fullName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                  )
            ORDER BY r.reservationDate DESC, r.reservationId DESC
            """)
    Page<Reservation> searchForAdmin(
            @Param("status") Reservation.ReservationStatus status,
            @Param("keyword") String keyword,
            Pageable pageable);

    /**
     * Returns pending reservations for a book.
     */
    @Query("SELECT r FROM Reservation r WHERE r.book.bookId = :bookId AND r.status = 'PENDING' ORDER BY r.reservationDate ASC")
    List<Reservation> findPendingReservationsForBook(@Param("bookId") Integer bookId);

    /**
     * Returns the first pending reservation for a book with a pessimistic lock.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT r FROM Reservation r
            WHERE r.book.bookId = :bookId AND r.status = 'PENDING'
            ORDER BY r.reservationDate ASC, r.reservationId ASC
            """)
    List<Reservation> findPendingReservationsForBookWithLock(@Param("bookId") Integer bookId, Pageable pageable);

    /**
     * Returns expired pending reservations.
     */
    @Query("SELECT r FROM Reservation r WHERE r.expiryDate < :today AND r.status = 'PENDING'")
    List<Reservation> findExpiredReservations(@Param("today") LocalDate today);

    /**
     * Returns active reservation count for a user.
     */
    @Query("SELECT COUNT(r) FROM Reservation r WHERE r.user.userId = :userId AND r.status = 'PENDING'")
    Long countActiveReservationsForUser(@Param("userId") Integer userId);

    long countByUserUserIdAndStatusIn(Integer userId, Collection<Reservation.ReservationStatus> statuses);

    /**
     * Returns whether the user already has an active reservation for the same book.
     */
    @Query("""
            SELECT COUNT(r) > 0
            FROM Reservation r
            WHERE r.user.userId = :userId
              AND r.book.bookId = :bookId
              AND r.status IN ('PENDING', 'AWAITING_PICKUP')
            """)
    boolean existsActiveReservationByUserAndBook(
            @Param("userId") Integer userId,
            @Param("bookId") Integer bookId);

    @Query("""
            SELECT r
            FROM Reservation r
            WHERE r.user.userId = :userId
              AND r.book.bookId = :bookId
              AND r.status IN ('PENDING', 'AWAITING_PICKUP')
            ORDER BY r.reservationDate DESC, r.reservationId DESC
            """)
    List<Reservation> findActiveReservationsByUserAndBook(
            @Param("userId") Integer userId,
            @Param("bookId") Integer bookId,
            Pageable pageable);

    /**
     * Returns whether another user already holds or waits for the same title.
     */
    @Query("""
            SELECT COUNT(r) > 0
            FROM Reservation r
            WHERE r.book.bookId = :bookId
              AND r.user.userId <> :userId
              AND r.status IN ('PENDING', 'AWAITING_PICKUP')
            """)
    boolean existsConflictingActiveReservationForBook(
            @Param("bookId") Integer bookId,
            @Param("userId") Integer userId);

    /**
     * Returns reservations by user and status.
     */
    List<Reservation> findByUserUserIdAndStatus(Integer userId, Reservation.ReservationStatus status);

    /**
     * Returns active pickup reservations for a copy.
     */
    @Query("SELECT r FROM Reservation r WHERE r.allocatedCopy.copyId = :copyId AND r.status = 'AWAITING_PICKUP'")
    List<Reservation> findActiveReservationByCopyId(@Param("copyId") Integer copyId);

    /**
     * Returns reservations past pickup deadline.
     */
    @Query("SELECT r FROM Reservation r WHERE r.pickupDeadline < :now AND r.status = 'AWAITING_PICKUP'")
    List<Reservation> findExpiredPickupReservations(@Param("now") LocalDateTime now);

    /**
     * Returns count of pending reservations.
     */
    @Query("SELECT COUNT(r) FROM Reservation r WHERE r.status = 'PENDING'")
    long countTotalPendingReservations();

    /**
     * Returns the current pending queue size for a book.
     */
    @Query("SELECT COUNT(r) FROM Reservation r WHERE r.book.bookId = :bookId AND r.status = 'PENDING'")
    int countPendingReservationsForBook(@Param("bookId") Integer bookId);

    @Query("""
            SELECT r.status, COUNT(r)
            FROM Reservation r
            WHERE (
                    :keyword IS NULL
                    OR LOWER(r.book.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(r.book.isbn) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(r.user.username) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(r.user.fullName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                  )
            GROUP BY r.status
            """)
    List<Object[]> countGroupedByStatusForAdmin(@Param("keyword") String keyword);

    @Query("SELECT r.status, COUNT(r) FROM Reservation r GROUP BY r.status")
    List<Object[]> countGroupedByStatus();

    /**
     * Returns pending queue for a book in stable order.
     */
    @Query("""
            SELECT r FROM Reservation r
            WHERE r.book.bookId = :bookId AND r.status = 'PENDING'
            ORDER BY r.reservationDate ASC, r.reservationId ASC
            """)
    List<Reservation> findPendingQueueForBook(@Param("bookId") Integer bookId);
}
