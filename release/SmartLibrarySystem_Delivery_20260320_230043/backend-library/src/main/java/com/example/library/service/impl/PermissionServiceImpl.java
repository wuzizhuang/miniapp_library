package com.example.library.service.impl;

import com.example.library.dto.rbac.PermissionCreateDto;
import com.example.library.dto.rbac.PermissionDto;
import com.example.library.entity.Permission;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.PermissionRepository;
import com.example.library.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 权限服务实现类。
 * 负责权限点查询、创建、删除以及 DTO 转换。
 */
@Service
@RequiredArgsConstructor
public class PermissionServiceImpl implements PermissionService {

    private final PermissionRepository permissionRepository;

    /**
     * 查询全部权限点。
     */
    @Override
    @Transactional(readOnly = true)
    public List<PermissionDto> getAllPermissions() {
        return permissionRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * 创建权限点。
     */
    @Override
    @Transactional
    public PermissionDto createPermission(PermissionCreateDto dto) {
        if (permissionRepository.existsByName(dto.getName())) {
            throw new BadRequestException("Permission '" + dto.getName() + "' already exists");
        }
        Permission permission = new Permission(dto.getName(), dto.getDescription());
        return toDto(permissionRepository.save(permission));
    }

    /**
     * 删除权限点。
     */
    @Override
    @Transactional
    public void deletePermission(Integer permissionId) {
        Permission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Permission not found: " + permissionId));
        permissionRepository.delete(permission);
    }

    /**
     * 将权限实体转换为 DTO。
     */
    private PermissionDto toDto(Permission p) {
        PermissionDto dto = new PermissionDto();
        dto.setPermissionId(p.getPermissionId());
        dto.setName(p.getName());
        dto.setDescription(p.getDescription());
        dto.setCreateTime(p.getCreateTime());
        return dto;
    }
}
