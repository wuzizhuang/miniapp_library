package com.example.library.dto;

import lombok.Data;

/**
 * Label-value pair for dashboard breakdowns.
 */
@Data
public class DashboardBreakdownItemDto {
    private String key;
    private String label;
    private Long value;
}
