package com.example.library.dto;

import lombok.Data;

/**
 * Author DTO.
 */
@Data
public class AuthorDto {
    private Integer authorId;
    private String name;
    private String biography;
    private Integer birthYear;
    private Integer deathYear;
}
