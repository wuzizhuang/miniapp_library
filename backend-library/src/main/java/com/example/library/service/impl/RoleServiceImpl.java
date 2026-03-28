package com.example.library.service.impl;

import com.example.library.dto.rbac.PermissionDto;
import com.example.library.dto.rbac.RoleCreateDto;
import com.example.library.dto.rbac.RoleDto;
import com.example.library.dto.rbac.UserRoleBatchPreviewDto;
import com.example.library.dto.rbac.UserRoleBatchUpdateResultDto;
import com.example.library.entity.Permission;
import com.example.library.entity.Role;
import com.example.library.entity.User;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.PermissionRepository;
import com.example.library.repository.RoleRepository;
import com.example.library.repository.UserRepository;
import com.example.library.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 角色服务实现类。
 * 负责角色、权限分配以及用户与角色之间的绑定和批量操作。
 */
@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;

    /**
     * 查询全部角色。
     */
    @Override
    @Transactional(readOnly = true)
    public List<RoleDto> getAllRoles() {
        return roleRepository.findAll().stream().map(this::toDto).toList();
    }

    /**
     * 根据角色 ID 查询详情。
     */
    @Override
    @Transactional(readOnly = true)
    public RoleDto getRoleById(Integer roleId) {
        return toDto(findRoleOrThrow(roleId));
    }

    /**
     * 创建角色。
     */
    @Override
    @Transactional
    public RoleDto createRole(RoleCreateDto dto) {
        if (roleRepository.existsByName(dto.getName())) {
            throw new BadRequestException("Role '" + dto.getName() + "' already exists");
        }
        Role role = new Role(dto.getName(), dto.getDisplayName(), dto.getDescription());
        return toDto(roleRepository.save(role));
    }

    /**
     * 删除角色。
     * 删除前会先解除该角色与所有用户之间的绑定关系。
     */
    @Override
    @Transactional
    public void deleteRole(Integer roleId) {
        Role role = findRoleOrThrow(roleId);
        List<User> usersWithRole = userRepository.findDistinctByRolesRoleId(roleId);
        for (User u : usersWithRole) {
            u.getRoles().remove(role);
        }
        if (!usersWithRole.isEmpty()) {
            userRepository.saveAll(usersWithRole);
        }
        roleRepository.delete(role);
    }

    /**
     * 为角色分配单个权限。
     */
    @Override
    @Transactional
    public RoleDto assignPermission(Integer roleId, Integer permissionId) {
        Role role = findRoleOrThrow(roleId);
        Permission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Permission not found: " + permissionId));
        role.getPermissions().add(permission);
        return toDto(roleRepository.save(role));
    }

    /**
     * 从角色中移除单个权限。
     */
    @Override
    @Transactional
    public RoleDto revokePermission(Integer roleId, Integer permissionId) {
        Role role = findRoleOrThrow(roleId);
        Permission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Permission not found: " + permissionId));
        role.getPermissions().remove(permission);
        return toDto(roleRepository.save(role));
    }

    /**
     * 批量为角色分配权限。
     */
    @Override
    @Transactional
    public RoleDto assignPermissions(Integer roleId, List<Integer> permissionIds) {
        if (permissionIds == null || permissionIds.isEmpty()) {
            throw new BadRequestException("permissionIds cannot be empty");
        }
        Role role = findRoleOrThrow(roleId);
        List<Permission> permissions = permissionRepository.findAllById(permissionIds);
        validatePermissionIds(permissionIds, permissions);
        role.getPermissions().addAll(permissions);
        return toDto(roleRepository.save(role));
    }

    /**
     * 批量从角色移除权限。
     */
    @Override
    @Transactional
    public RoleDto revokePermissions(Integer roleId, List<Integer> permissionIds) {
        if (permissionIds == null || permissionIds.isEmpty()) {
            throw new BadRequestException("permissionIds cannot be empty");
        }
        Role role = findRoleOrThrow(roleId);
        List<Permission> permissions = permissionRepository.findAllById(permissionIds);
        validatePermissionIds(permissionIds, permissions);
        role.getPermissions().removeAll(permissions);
        return toDto(roleRepository.save(role));
    }

    /**
     * 为单个用户分配角色。
     */
    @Override
    @Transactional
    public void assignRoleToUser(Integer userId, Integer roleId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        Role role = findRoleOrThrow(roleId);
        user.getRoles().add(role);
        userRepository.save(user);
    }

    /**
     * 从单个用户撤销角色。
     */
    @Override
    @Transactional
    public void revokeRoleFromUser(Integer userId, Integer roleId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        Role role = findRoleOrThrow(roleId);
        user.getRoles().remove(role);
        userRepository.save(user);
    }

    /**
     * 批量为多个用户分配角色。
     * 返回值会区分成功、生效、未变化和缺失用户等情况。
     */
    @Override
    @Transactional
    public UserRoleBatchUpdateResultDto assignRoleToUsers(List<Integer> userIds, Integer roleId) {
        List<Integer> requestedUserIds = normalizeUserIds(userIds);
        if (requestedUserIds.isEmpty()) {
            throw new BadRequestException("userIds cannot be empty");
        }
        Role role = findRoleOrThrow(roleId);
        List<User> users = userRepository.findAllById(requestedUserIds);
        Map<Integer, User> userMap = users.stream()
                .collect(Collectors.toMap(User::getUserId, u -> u));

        UserRoleBatchUpdateResultDto result = buildBaseUserRoleResult("ASSIGN", role, requestedUserIds.size());
        List<User> toSave = new java.util.ArrayList<>();

        for (Integer userId : requestedUserIds) {
            User user = userMap.get(userId);
            if (user == null) {
                result.getMissingUserIds().add(userId);
                continue;
            }
            if (user.getRoles().contains(role)) {
                result.getUnchangedUserIds().add(userId);
                continue;
            }
            user.getRoles().add(role);
            toSave.add(user);
        }

        if (!toSave.isEmpty()) {
            userRepository.saveAll(toSave);
        }

        finalizeUserRoleResult(result, requestedUserIds.size(), users.size(), toSave.size());
        return result;
    }

    /**
     * 批量从多个用户撤销角色。
     */
    @Override
    @Transactional
    public UserRoleBatchUpdateResultDto revokeRoleFromUsers(List<Integer> userIds, Integer roleId) {
        List<Integer> requestedUserIds = normalizeUserIds(userIds);
        if (requestedUserIds.isEmpty()) {
            throw new BadRequestException("userIds cannot be empty");
        }
        Role role = findRoleOrThrow(roleId);
        List<User> users = userRepository.findAllById(requestedUserIds);
        Map<Integer, User> userMap = users.stream()
                .collect(Collectors.toMap(User::getUserId, u -> u));

        UserRoleBatchUpdateResultDto result = buildBaseUserRoleResult("REVOKE", role, requestedUserIds.size());
        List<User> toSave = new java.util.ArrayList<>();

        for (Integer userId : requestedUserIds) {
            User user = userMap.get(userId);
            if (user == null) {
                result.getMissingUserIds().add(userId);
                continue;
            }
            if (!user.getRoles().contains(role)) {
                result.getUnchangedUserIds().add(userId);
                continue;
            }
            user.getRoles().remove(role);
            toSave.add(user);
        }

        if (!toSave.isEmpty()) {
            userRepository.saveAll(toSave);
        }

        finalizeUserRoleResult(result, requestedUserIds.size(), users.size(), toSave.size());
        return result;
    }

    /**
     * 预览批量角色操作影响，不真正落库。
     */
    @Override
    @Transactional(readOnly = true)
    public UserRoleBatchPreviewDto previewRoleOperation(List<Integer> userIds, Integer roleId) {
        List<Integer> requestedUserIds = normalizeUserIds(userIds);
        if (requestedUserIds.isEmpty()) {
            throw new BadRequestException("userIds cannot be empty");
        }

        Role role = findRoleOrThrow(roleId);
        List<User> users = userRepository.findAllById(requestedUserIds);
        Map<Integer, User> userMap = users.stream()
                .collect(Collectors.toMap(User::getUserId, u -> u));

        UserRoleBatchPreviewDto preview = new UserRoleBatchPreviewDto();
        preview.setRoleId(role.getRoleId());
        preview.setRoleName(role.getName());
        preview.setRequestedCount(requestedUserIds.size());
        preview.setValidUserCount(users.size());

        for (Integer userId : requestedUserIds) {
            User user = userMap.get(userId);
            if (user == null) {
                preview.getMissingUserIds().add(userId);
                continue;
            }
            if (user.getRoles().contains(role)) {
                preview.getAlreadyAssignedUserIds().add(userId);
            }
        }

        int alreadyAssigned = preview.getAlreadyAssignedUserIds().size();
        preview.setAlreadyAssignedCount(alreadyAssigned);
        preview.setWillBeAssignedCount(users.size() - alreadyAssigned);
        preview.setWillBeRevokedCount(alreadyAssigned);
        return preview;
    }

    /**
     * 查询某个用户当前已绑定的角色。
     */
    @Override
    @Transactional(readOnly = true)
    public List<RoleDto> getUserRoles(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        return user.getRoles().stream().map(this::toDto).toList();
    }

    /**
     * 按 ID 查询角色，查不到时抛出异常。
     */
    private Role findRoleOrThrow(Integer roleId) {
        return roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleId));
    }

    /**
     * 校验传入的权限 ID 是否全部存在。
     */
    private void validatePermissionIds(List<Integer> requestedIds, List<Permission> foundPermissions) {
        Set<Integer> foundIds = foundPermissions.stream()
                .map(Permission::getPermissionId)
                .collect(Collectors.toSet());
        List<Integer> missing = requestedIds.stream()
                .filter(id -> !foundIds.contains(id))
                .distinct()
                .toList();
        if (!missing.isEmpty()) {
            throw new ResourceNotFoundException("Permission not found: " + missing);
        }
    }

    /**
     * 归一化用户 ID 列表：去空、去重、去除非法值。
     */
    private List<Integer> normalizeUserIds(List<Integer> userIds) {
        if (userIds == null) {
            return List.of();
        }
        return new java.util.ArrayList<>(new LinkedHashSet<>(
                userIds.stream()
                        .filter(id -> id != null && id > 0)
                        .toList()));
    }

    /**
     * 构造批量用户角色操作的基础返回对象。
     */
    private UserRoleBatchUpdateResultDto buildBaseUserRoleResult(
            String operation,
            Role role,
            int requestedCount) {
        UserRoleBatchUpdateResultDto result = new UserRoleBatchUpdateResultDto();
        result.setRoleId(role.getRoleId());
        result.setRoleName(role.getName());
        result.setOperation(operation);
        result.setRequestedCount(requestedCount);
        return result;
    }

    /**
     * 补全批量操作统计信息。
     */
    private void finalizeUserRoleResult(
            UserRoleBatchUpdateResultDto result,
            int requestedCount,
            int processedCount,
            int affectedCount) {
        result.setRequestedCount(requestedCount);
        result.setProcessedCount(processedCount);
        result.setAffectedCount(affectedCount);
        result.setUnchangedCount(result.getUnchangedUserIds().size());
    }

    /**
     * 将角色实体转换为 DTO，并展开其权限点信息。
     */
    private RoleDto toDto(Role role) {
        RoleDto dto = new RoleDto();
        dto.setRoleId(role.getRoleId());
        dto.setName(role.getName());
        dto.setDisplayName(role.getDisplayName());
        dto.setDescription(role.getDescription());
        dto.setCreateTime(role.getCreateTime());
        dto.setPermissions(role.getPermissions().stream().map(p -> {
            PermissionDto pd = new PermissionDto();
            pd.setPermissionId(p.getPermissionId());
            pd.setName(p.getName());
            pd.setDescription(p.getDescription());
            pd.setCreateTime(p.getCreateTime());
            return pd;
        }).toList());
        return dto;
    }
}
