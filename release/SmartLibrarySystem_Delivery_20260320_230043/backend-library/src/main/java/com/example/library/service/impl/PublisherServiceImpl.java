package com.example.library.service.impl;

import com.example.library.dto.PublisherDto;
import com.example.library.entity.Publisher;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.PublisherRepository;
import com.example.library.service.PublisherService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 出版社服务实现类。
 * 负责出版社数据的校验、增删改查与实体转换。
 */
@Service
@RequiredArgsConstructor
public class PublisherServiceImpl implements PublisherService {

    private final PublisherRepository publisherRepository;

    /**
     * 创建出版社。
     */
    @Override
    @Transactional
    public PublisherDto createPublisher(PublisherDto dto) {
        String normalizedName = normalizeRequiredName(dto.getName());
        if (publisherRepository.existsByNameIgnoreCaseAndIsDeletedFalse(normalizedName)) {
            throw new BadRequestException("Publisher '" + normalizedName + "' already exists");
        }

        Publisher publisher = new Publisher();
        publisher.setName(normalizedName);
        publisher.setAddress(normalizeNullable(dto.getAddress()));
        publisher.setContactInfo(normalizeNullable(dto.getContactInfo()));

        Publisher saved = publisherRepository.save(publisher);
        return convertToDto(saved);
    }

    /**
     * 查询全部未删除出版社，不分页。
     */
    @Override
    @Transactional(readOnly = true)
    public java.util.List<PublisherDto> getAllPublishers() {
        return publisherRepository.findByIsDeletedFalseOrderByNameAsc().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * 分页查询未删除出版社。
     */
    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<PublisherDto> getAllPublishers(
            org.springframework.data.domain.Pageable pageable) {
        return publisherRepository.findByIsDeletedFalseOrderByNameAsc(pageable).map(this::convertToDto);
    }

    /**
     * 根据出版社 ID 查询详情。
     */
    @Override
    @Transactional(readOnly = true)
    public PublisherDto getPublisherById(Integer id) {
        Publisher publisher = publisherRepository.findByPublisherIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Publisher not found with id: " + id));
        return convertToDto(publisher);
    }

    /**
     * 软删除出版社。
     * 通过改名避免后续新增同名出版社时触发唯一键冲突。
     */
    @Override
    @Transactional
    public void deletePublisher(Integer id) {
        Publisher publisher = publisherRepository.findByPublisherIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Publisher not found with id: " + id));
        publisher.setIsDeleted(true);
        publisher.setName(publisher.getName() + "_DELETED_" + System.currentTimeMillis());

        publisherRepository.save(publisher);

    }

    /**
     * 更新出版社。
     */
    @Override
    @Transactional
    public PublisherDto updatePublisher(Integer id, PublisherDto publisherDto) {
        Publisher publisher = publisherRepository.findByPublisherIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Publisher not found with id: " + id));

        String normalizedName = normalizeRequiredName(publisherDto.getName());
        if (publisherRepository.existsByNameIgnoreCaseAndPublisherIdNotAndIsDeletedFalse(normalizedName, id)) {
            throw new BadRequestException("Publisher '" + normalizedName + "' already exists");
        }

        publisher.setName(normalizedName);
        publisher.setAddress(normalizeNullable(publisherDto.getAddress()));
        publisher.setContactInfo(normalizeNullable(publisherDto.getContactInfo()));
        Publisher updatedPublisher = publisherRepository.save(publisher);
        return convertToDto(updatedPublisher);

    }

    /**
     * 规范化并校验必填名称字段。
     */
    private String normalizeRequiredName(String value) {
        String normalized = normalizeNullable(value);
        if (normalized == null) {
            throw new BadRequestException("Publisher name cannot be blank");
        }
        return normalized;
    }

    /**
     * 规范化可空字符串：去除首尾空白，空串转为 null。
     */
    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    /**
     * 将出版社实体转换为 DTO。
     */
    private PublisherDto convertToDto(Publisher entity) {
        PublisherDto dto = new PublisherDto();
        dto.setPublisherId(entity.getPublisherId());
        dto.setName(entity.getName());
        dto.setAddress(entity.getAddress());
        dto.setContactInfo(entity.getContactInfo());
        return dto;
    }
}
