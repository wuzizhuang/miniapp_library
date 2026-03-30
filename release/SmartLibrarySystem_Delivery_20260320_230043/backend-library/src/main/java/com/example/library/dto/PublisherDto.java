package com.example.library.dto;

import lombok.Data;

/**
 * Publisher DTO.
 */
@Data
public class PublisherDto {
    private Integer publisherId;
    private String name;
    private String address;
    private String contactInfo;
}
