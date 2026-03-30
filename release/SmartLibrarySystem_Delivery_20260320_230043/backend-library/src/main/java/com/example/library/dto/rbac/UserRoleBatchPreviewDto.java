package com.example.library.dto.rbac;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Preview data for batch user-role operations.
 */
@Data
public class UserRoleBatchPreviewDto {
    private Integer roleId;
    private String roleName;
    private int requestedCount;
    private int validUserCount;
    private int alreadyAssignedCount;
    private int willBeAssignedCount;
    private int willBeRevokedCount;
    private List<Integer> missingUserIds = new ArrayList<>();
    private List<Integer> alreadyAssignedUserIds = new ArrayList<>();
}
