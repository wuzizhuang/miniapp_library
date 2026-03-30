package com.example.library.service;

import com.example.library.dto.PublisherDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Publisher service.
 */
public interface PublisherService {
    /**
     * Creates a publisher.
     */
    PublisherDto createPublisher(PublisherDto publisherDto);

    /**
     * Returns paged publishers.
     */
    Page<PublisherDto> getAllPublishers(Pageable pageable);

    /**
     * Returns all publishers (unpaged, for internal use).
     */
    java.util.List<PublisherDto> getAllPublishers();

    /**
     * Returns a publisher by id.
     */
    PublisherDto getPublisherById(Integer id);

    /**
     * Deletes a publisher.
     */
    void deletePublisher(Integer id);

    /**
     * Updates a publisher.
     */
    PublisherDto updatePublisher(Integer id, PublisherDto publisherDto);
}
