package com.example.library.dto;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * DTO for returning a search history entry.
 */
@Data
public class SearchLogDto {
    private Long searchId;
    private String keyword;
    private Integer resultCount;
    private LocalDateTime searchTime;
}
