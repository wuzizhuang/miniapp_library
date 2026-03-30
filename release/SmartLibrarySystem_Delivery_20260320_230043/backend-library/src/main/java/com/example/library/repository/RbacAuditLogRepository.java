package com.example.library.repository;

import com.example.library.entity.RbacAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

/**
 * Repository for RBAC audit logs.
 */
@Repository
public interface RbacAuditLogRepository extends JpaRepository<RbacAuditLog, Long> {
    Page<RbacAuditLog> findAllByOrderByCreateTimeDesc(Pageable pageable);

    @Query("""
            SELECT l
            FROM RbacAuditLog l
            WHERE (:actionType IS NULL OR l.actionType = :actionType)
              AND (:actorUsername IS NULL OR LOWER(l.actorUsername) LIKE LOWER(CONCAT('%', :actorUsername, '%')))
              AND (:fromTime IS NULL OR l.createTime >= :fromTime)
              AND (:toTime IS NULL OR l.createTime <= :toTime)
            ORDER BY l.createTime DESC
            """)
    Page<RbacAuditLog> search(
            @Param("actionType") String actionType,
            @Param("actorUsername") String actorUsername,
            @Param("fromTime") LocalDateTime fromTime,
            @Param("toTime") LocalDateTime toTime,
            Pageable pageable);
}
