package com.example.library.dto;

import lombok.Data;

/**
 * Category DTO.
 */
@Data
public class CategoryDto {
    private Integer categoryId;
    private String name;
    private Integer parentId;
    private String parentName;
    private String description;
}
