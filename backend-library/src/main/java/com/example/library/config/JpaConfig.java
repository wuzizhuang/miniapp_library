package com.example.library.config;


import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA 审计配置类。
 * 启用后，实体上的创建时间、更新时间等审计注解会自动生效。
 */
@Configuration
@EnableJpaAuditing
public class JpaConfig {
}
