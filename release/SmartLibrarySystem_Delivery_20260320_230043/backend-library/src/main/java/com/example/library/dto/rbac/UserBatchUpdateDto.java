package com.example.library.dto.rbac;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

/**
 * Request DTO for batch user-role assignment/revocation.
 */
@Data
public class UserBatchUpdateDto {

    @NotEmpty(message = "userIds cannot be empty")
    private List<Integer> userIds;
}
