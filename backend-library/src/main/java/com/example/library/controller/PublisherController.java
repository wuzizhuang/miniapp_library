package com.example.library.controller;

import com.example.library.dto.PublisherDto;
import com.example.library.service.PublisherService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 出版社管理控制器。
 * 提供出版社查询和后台维护接口。
 */
@RestController
@RequestMapping("/api/publishers")
@RequiredArgsConstructor
public class PublisherController {

    private final PublisherService publisherService;

    /**
     * 分页查询出版社列表。
     */
    @GetMapping
    public ResponseEntity<Page<PublisherDto>> getAllPublishers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(publisherService.getAllPublishers(PageRequest.of(page, size)));
    }

    /**
     * 根据出版社 ID 查询详情。
     */
    @GetMapping("/{id}")
    public ResponseEntity<PublisherDto> getPublisherById(@PathVariable Integer id) {
        return ResponseEntity.ok(publisherService.getPublisherById(id));
    }

    /**
     * 新增出版社。
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PublisherDto> createPublisher(@RequestBody PublisherDto publisherDto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(publisherService.createPublisher(publisherDto));
    }

    /**
     * 更新出版社信息。
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PublisherDto> updatePublisher(@PathVariable Integer id,
            @RequestBody PublisherDto publisherDto) {
        return ResponseEntity.ok(publisherService.updatePublisher(id, publisherDto));
    }

    /**
     * 删除出版社。
     * 当前业务层采用软删除。
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deletePublisher(@PathVariable Integer id) {
        publisherService.deletePublisher(id);
        return ResponseEntity.noContent().build();
    }
}
