package com.example.library.dto.rbac;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

/**
 * Request DTO for batch permission assignment/revocation.
 */
@Data
public class PermissionBatchUpdateDto {

    @NotEmpty(message = "permissionIds cannot be empty")
    private List<Integer> permissionIds;
}
