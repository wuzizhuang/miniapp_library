package com.example.library.config;


import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Enables JPA auditing annotations.
 */
@Configuration
@EnableJpaAuditing
public class JpaConfig {
}
