package com.example.library.dto.rbac;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Result data for batch user-role assign/revoke operations.
 */
@Data
public class UserRoleBatchUpdateResultDto {
    private Integer roleId;
    private String roleName;
    private String operation;
    private int requestedCount;
    private int processedCount;
    private int affectedCount;
    private int unchangedCount;
    private List<Integer> missingUserIds = new ArrayList<>();
    private List<Integer> unchangedUserIds = new ArrayList<>();
    private List<Integer> failedUserIds = new ArrayList<>();
}
