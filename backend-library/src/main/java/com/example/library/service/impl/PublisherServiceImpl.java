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
 * Default publisher service implementation.
 */
@Service
@RequiredArgsConstructor
public class PublisherServiceImpl implements PublisherService {

    private final PublisherRepository publisherRepository;

    /**
     * Creates a publisher.
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
     * Returns all publishers (unpaged, for internal use).
     */
    @Override
    @Transactional(readOnly = true)
    public java.util.List<PublisherDto> getAllPublishers() {
        return publisherRepository.findByIsDeletedFalseOrderByNameAsc().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Returns paged publishers.
     */
    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<PublisherDto> getAllPublishers(
            org.springframework.data.domain.Pageable pageable) {
        return publisherRepository.findByIsDeletedFalseOrderByNameAsc(pageable).map(this::convertToDto);
    }

    /**
     * Returns a publisher by id.
     */
    @Override
    @Transactional(readOnly = true)
    public PublisherDto getPublisherById(Integer id) {
        Publisher publisher = publisherRepository.findByPublisherIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Publisher not found with id: " + id));
        return convertToDto(publisher);
    }

    /**
     * Soft-deletes a publisher.
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
     * Updates a publisher.
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

    private String normalizeRequiredName(String value) {
        String normalized = normalizeNullable(value);
        if (normalized == null) {
            throw new BadRequestException("Publisher name cannot be blank");
        }
        return normalized;
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    /**
     * Maps entity to DTO.
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
