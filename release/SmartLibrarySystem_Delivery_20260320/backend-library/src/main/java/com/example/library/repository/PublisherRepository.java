package com.example.library.repository;

import com.example.library.entity.Publisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for publisher queries.
 */
@Repository
public interface PublisherRepository extends JpaRepository<Publisher, Integer> {

    List<Publisher> findByIsDeletedFalseOrderByNameAsc();

    Page<Publisher> findByIsDeletedFalseOrderByNameAsc(Pageable pageable);

    Optional<Publisher> findByPublisherIdAndIsDeletedFalse(Integer publisherId);

    boolean existsByNameIgnoreCaseAndIsDeletedFalse(String name);

    boolean existsByNameIgnoreCaseAndPublisherIdNotAndIsDeletedFalse(String name, Integer publisherId);
}
