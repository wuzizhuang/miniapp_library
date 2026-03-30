package com.example.library.repository;

import com.example.library.entity.ServiceAppointment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Repository for service appointment queries.
 */
@Repository
public interface ServiceAppointmentRepository extends JpaRepository<ServiceAppointment, Integer> {

    /**
     * Returns paged appointments for a user.
     */
    Page<ServiceAppointment> findByUserUserId(Integer userId, Pageable pageable);

    /**
     * Returns paged appointments filtered by status.
     */
    Page<ServiceAppointment> findByStatus(ServiceAppointment.AppointmentStatus status, Pageable pageable);

    boolean existsByLoanLoanIdAndServiceTypeAndStatus(
            Integer loanId,
            ServiceAppointment.ServiceType serviceType,
            ServiceAppointment.AppointmentStatus status);

    Optional<ServiceAppointment> findFirstByLoanLoanIdAndServiceTypeAndStatusOrderByAppointmentIdDesc(
            Integer loanId,
            ServiceAppointment.ServiceType serviceType,
            ServiceAppointment.AppointmentStatus status);

    @Query("""
            SELECT sa
            FROM ServiceAppointment sa
            WHERE sa.user.userId = :userId
              AND sa.status = 'PENDING'
              AND sa.serviceType = :serviceType
              AND sa.scheduledTime = :scheduledTime
              AND sa.method = :method
              AND ((:loanId IS NULL AND sa.loan IS NULL) OR sa.loan.loanId = :loanId)
              AND COALESCE(sa.returnLocation, '') = COALESCE(:returnLocation, '')
              AND COALESCE(sa.notes, '') = COALESCE(:notes, '')
            ORDER BY sa.appointmentId DESC
            """)
    List<ServiceAppointment> findDuplicatePendingAppointments(
            @Param("userId") Integer userId,
            @Param("serviceType") ServiceAppointment.ServiceType serviceType,
            @Param("scheduledTime") LocalDateTime scheduledTime,
            @Param("method") ServiceAppointment.ServiceMethod method,
            @Param("loanId") Integer loanId,
            @Param("returnLocation") String returnLocation,
            @Param("notes") String notes,
            Pageable pageable);

    /**
     * Counts appointments for a user and status.
     */
    long countByUserUserIdAndStatus(Integer userId, ServiceAppointment.AppointmentStatus status);

    /**
     * Counts appointments for a user across statuses.
     */
    long countByUserUserIdAndStatusIn(Integer userId, Collection<ServiceAppointment.AppointmentStatus> statuses);

    /**
     * Counts pending appointments within a time range.
     */
    @Query("SELECT COUNT(sa) FROM ServiceAppointment sa WHERE sa.scheduledTime BETWEEN :start AND :end AND sa.status = 'PENDING'")
    Long countAppointmentsInTimeRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Returns appointments scheduled within a time window.
     */
    List<ServiceAppointment> findByScheduledTimeBetweenAndStatus(LocalDateTime start, LocalDateTime end, ServiceAppointment.AppointmentStatus status);

    /**
     * Returns appointments for admin search and filtering.
     */
    @Query("""
            SELECT sa
            FROM ServiceAppointment sa
            LEFT JOIN sa.user u
            LEFT JOIN sa.loan l
            LEFT JOIN l.copy c
            LEFT JOIN c.book b
            WHERE (:status IS NULL OR sa.status = :status)
              AND (
                    :keyword IS NULL
                    OR LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(u.fullName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(b.title, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(sa.returnLocation, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(sa.notes, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                  )
            """)
    Page<ServiceAppointment> searchForAdmin(
            @Param("status") ServiceAppointment.AppointmentStatus status,
            @Param("keyword") String keyword,
            Pageable pageable);

    @Query("""
            SELECT sa.status, COUNT(sa)
            FROM ServiceAppointment sa
            LEFT JOIN sa.user u
            LEFT JOIN sa.loan l
            LEFT JOIN l.copy c
            LEFT JOIN c.book b
            WHERE (
                    :keyword IS NULL
                    OR LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(u.fullName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(b.title, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(sa.returnLocation, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(sa.notes, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                  )
            GROUP BY sa.status
            """)
    List<Object[]> countGroupedByStatusForAdmin(@Param("keyword") String keyword);
}
