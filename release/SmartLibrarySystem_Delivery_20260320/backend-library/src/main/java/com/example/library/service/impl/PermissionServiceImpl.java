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
 * Permission service implementation.
 */
@Service
@RequiredArgsConstructor
public class PermissionServiceImpl implements PermissionService {

    private final PermissionRepository permissionRepository;

    @Override
    @Transactional(readOnly = true)
    public List<PermissionDto> getAllPermissions() {
        return permissionRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional
    public PermissionDto createPermission(PermissionCreateDto dto) {
        if (permissionRepository.existsByName(dto.getName())) {
            throw new BadRequestException("Permission '" + dto.getName() + "' already exists");
        }
        Permission permission = new Permission(dto.getName(), dto.getDescription());
        return toDto(permissionRepository.save(permission));
    }

    @Override
    @Transactional
    public void deletePermission(Integer permissionId) {
        Permission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Permission not found: " + permissionId));
        permissionRepository.delete(permission);
    }

    private PermissionDto toDto(Permission p) {
        PermissionDto dto = new PermissionDto();
        dto.setPermissionId(p.getPermissionId());
        dto.setName(p.getName());
        dto.setDescription(p.getDescription());
        dto.setCreateTime(p.getCreateTime());
        return dto;
    }
}
