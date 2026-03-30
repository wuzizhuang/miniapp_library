package com.example.library.dto.rbac;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request DTO for creating a new permission.
 */
@Data
public class PermissionCreateDto {

    /**
     * Permission name in resource:action format (e.g. "book:write").
     */
    @NotBlank(message = "Permission name is required")
    @Size(max = 100)
    @Pattern(regexp = "^[a-z_]+:[a-z_]+$", message = "Permission name must be in format 'resource:action' (lowercase)")
    private String name;

    @Size(max = 255)
    private String description;
}
