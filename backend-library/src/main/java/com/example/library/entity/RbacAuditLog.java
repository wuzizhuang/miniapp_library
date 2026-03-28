package com.example.library.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * RBAC 审计日志实体。
 * 用于记录角色、权限、用户角色绑定等后台权限管理操作。
 */
@Entity
@Table(name = "rbac_audit_logs")
@Getter
@Setter
public class RbacAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    @Column(name = "actor_user_id")
    private Integer actorUserId;

    @Column(name = "actor_username", length = 100, nullable = false)
    private String actorUsername;

    @Column(name = "action_type", length = 50, nullable = false)
    private String actionType;

    @Column(name = "target_type", length = 50, nullable = false)
    private String targetType;

    @Column(name = "target_id", length = 100)
    private String targetId;

    @Lob
    @Column(name = "detail")
    private String detail;

    @CreationTimestamp
    @Column(name = "create_time", nullable = false, updatable = false)
    private LocalDateTime createTime;
}
