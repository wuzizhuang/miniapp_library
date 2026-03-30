package com.example.library.dto;

import lombok.Data;

import java.time.LocalDate;

/**
 * Single dashboard trend point.
 */
@Data
public class DashboardTrendPointDto {
    private LocalDate date;
    private Long borrowCount;
    private Long returnCount;
}
