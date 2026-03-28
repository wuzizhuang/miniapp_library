package com.example.library.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * AI 网关配置实体。
 * 保存后台管理页可编辑的 AI 开关、模型、基础地址和加密后的 API Key。
 */
@Entity
@Table(name = "ai_gateway_settings")
@Getter
@Setter
public class AiGatewaySettings {

    /**
     * 当前表采用单例配置模式，固定只维护一条记录。
     */
    @Id
    @Column(name = "settings_id")
    private Integer settingsId;

    @Column(name = "enabled", nullable = false)
    private Boolean enabled = Boolean.FALSE;

    @Column(name = "provider", length = 40, nullable = false)
    private String provider = "openai";

    @Column(name = "base_url", length = 255)
    private String baseUrl;

    @Column(name = "model_name", length = 120)
    private String modelName;

    @Column(name = "encrypted_api_key", length = 1024)
    private String encryptedApiKey;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @CreationTimestamp
    @Column(name = "create_time", nullable = false, updatable = false)
    private LocalDateTime createTime;

    @UpdateTimestamp
    @Column(name = "update_time", nullable = false)
    private LocalDateTime updateTime;
}
