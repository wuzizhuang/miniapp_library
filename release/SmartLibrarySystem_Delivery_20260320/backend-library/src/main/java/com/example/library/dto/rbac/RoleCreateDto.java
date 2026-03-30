package com.example.library.dto.rbac;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request DTO for creating a new role.
 */
@Data
public class RoleCreateDto {

    /**
     * Role name in SCREAMING_SNAKE_CASE (e.g. "CATALOGER", "LOAN_CLERK").
     */
    @NotBlank(message = "Role name is required")
    @Size(max = 50)
    @Pattern(regexp = "^[A-Z][A-Z0-9_]*$", message = "Role name must be uppercase (e.g. CATALOGER)")
    private String name;

    @Size(max = 100)
    private String displayName;

    @Size(max = 255)
    private String description;
}
