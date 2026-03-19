package com.example.library.repository;

import com.example.library.entity.AiGatewaySettings;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository for persisted AI gateway settings.
 */
public interface AiGatewaySettingsRepository extends JpaRepository<AiGatewaySettings, Integer> {
}
