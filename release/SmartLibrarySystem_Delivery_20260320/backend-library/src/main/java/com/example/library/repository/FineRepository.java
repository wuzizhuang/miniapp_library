package com.example.library.repository;

import com.example.library.entity.Fine;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

/**
 * Repository for fine queries.
 */
@Repository
public interface FineRepository extends JpaRepository<Fine, Integer> {

    Page<Fine> findByUserUserId(Integer userId, Pageable pageable);

    Page<Fine> findByStatus(Fine.FineStatus status, Pageable pageable);

    @Query("""
            SELECT f
            FROM Fine f
            JOIN f.user u
            JOIN f.loan l
            JOIN l.copy c
            JOIN c.book b
            WHERE (:status IS NULL OR f.status = :status)
              AND (
                    :keyword IS NULL
                    OR LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(u.fullName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(b.title, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(f.reason, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR STR(f.fineId) LIKE CONCAT('%', :keyword, '%')
                  )
            """)
    Page<Fine> searchForAdmin(
            @Param("status") Fine.FineStatus status,
            @Param("keyword") String keyword,
            Pageable pageable);

    @Query("SELECT SUM(f.amount) FROM Fine f WHERE f.user.userId = :userId AND f.status = 'PENDING'")
    BigDecimal getTotalPendingFinesForUser(@Param("userId") Integer userId);

    @Query("SELECT COUNT(f) FROM Fine f WHERE f.user.userId = :userId AND f.status = 'PENDING'")
    Long countPendingFinesForUser(@Param("userId") Integer userId);

    @Query("SELECT COALESCE(SUM(f.amount), 0) FROM Fine f WHERE f.status = 'PENDING'")
    BigDecimal sumTotalPendingFines();

    @Query("SELECT f.status, COUNT(f) FROM Fine f GROUP BY f.status")
    List<Object[]> countGroupedByStatus();
}
