package com.example.library.service.impl;

import com.example.library.dto.book.BookCopyCreateDto;
import com.example.library.dto.book.BookCopyDto;
import com.example.library.dto.book.BookCopyUpdateDto;
import com.example.library.entity.Book;
import com.example.library.entity.BookCopy;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.BookCopyRepository;
import com.example.library.repository.BookRepository;
import com.example.library.service.BookCopyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 图书副本库存服务实现。
 * 负责副本的创建、更新、分页筛选与 DTO 转换。
 */
@Service
@RequiredArgsConstructor
public class BookCopyServiceImpl implements BookCopyService {

    private final BookCopyRepository bookCopyRepository;
    private final BookRepository bookRepository;

    /**
     * 创建单个副本，并挂载到指定图书名下。
     */
    @Override
    @Transactional
    public BookCopyDto createBookCopy(BookCopyCreateDto dto) {
        Book book = bookRepository.findById(dto.getBookId())
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + dto.getBookId()));

        BookCopy copy = new BookCopy();
        copy.setBook(book);
        copy.setStatus(dto.getStatus());
        copy.setAcquisitionDate(dto.getAcquisitionDate());
        copy.setPrice(dto.getPrice());
        copy.setNotes(dto.getNotes());
        copy.setLocationCode(normalizeBlank(dto.getLocationCode()));
        copy.setRfidTag(normalizeBlank(dto.getRfidTag()));
        copy.setFloorPlanId(dto.getFloorPlanId());

        BookCopy savedCopy = bookCopyRepository.save(copy);
        return convertToDto(savedCopy);
    }

    /**
     * 根据副本主键读取详情。
     */
    @Override
    @Transactional(readOnly = true)
    public BookCopyDto getBookCopyById(Integer id) {
        BookCopy copy = bookCopyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BookCopy not found with id: " + id));
        return convertToDto(copy);
    }

    /**
     * 更新副本信息，仅覆盖请求中显式提供的字段。
     */
    @Override
    @Transactional
    public BookCopyDto updateBookCopy(Integer id, BookCopyUpdateDto dto) {
        BookCopy copy = bookCopyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BookCopy not found with id: " + id));

        if (dto.getStatus() != null)
            copy.setStatus(dto.getStatus());
        if (dto.getAcquisitionDate() != null)
            copy.setAcquisitionDate(dto.getAcquisitionDate());
        if (dto.getPrice() != null)
            copy.setPrice(dto.getPrice());
        if (dto.getNotes() != null)
            copy.setNotes(dto.getNotes());
        if (dto.getLocationCode() != null)
            copy.setLocationCode(normalizeBlank(dto.getLocationCode()));
        if (dto.getRfidTag() != null)
            copy.setRfidTag(normalizeBlank(dto.getRfidTag()));
        if (dto.getFloorPlanId() != null)
            copy.setFloorPlanId(dto.getFloorPlanId());

        return convertToDto(bookCopyRepository.save(copy));
    }

    /**
     * 删除副本。
     */
    @Override
    @Transactional
    public void deleteBookCopy(Integer id) {
        if (!bookCopyRepository.existsById(id)) {
            throw new ResourceNotFoundException("BookCopy not found with id: " + id);
        }
        bookCopyRepository.deleteById(id);
    }

    /**
     * 查询某本书下的全部副本。
     */
    @Override
    @Transactional(readOnly = true)
    public List<BookCopyDto> getBookCopiesByBookId(Integer bookId) {
        return bookCopyRepository.findByBookBookId(bookId).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * 分页查询副本。
     * 支持图书、状态和关键词的组合过滤，供后台库存页使用。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<BookCopyDto> getAllBookCopies(int page, int size, String sortBy, String direction, Integer bookId, String status,
            String keyword) {
        Sort.Direction sortDirection = direction.equalsIgnoreCase("DESC") ? Sort.Direction.DESC : Sort.Direction.ASC;
        // 前端列表默认传的是 id，这里映射到实体字段 copyId。
        String actualSortBy = "id".equals(sortBy) ? "copyId" : sortBy;
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, actualSortBy));

        // 通过 Specification 按需拼接筛选条件，避免为每种组合再定义一个仓储方法。
        org.springframework.data.jpa.domain.Specification<BookCopy> spec = org.springframework.data.jpa.domain.Specification
                .where(null);

        if (bookId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("book").get("bookId"), bookId));
        }

        if (status != null && !status.isBlank()) {
            try {
                BookCopy.CopyStatus copyStatus = BookCopy.CopyStatus.valueOf(status.toUpperCase());
                spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), copyStatus));
            } catch (IllegalArgumentException ignored) {
                // 非法状态直接忽略，不阻断整个列表请求。
            }
        }

        if (keyword != null && !keyword.isBlank()) {
            String pattern = "%" + keyword.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("book").get("title")), pattern),
                    cb.like(cb.lower(root.get("book").get("isbn")), pattern)));
        }

        return bookCopyRepository.findAll(spec, pageable).map(this::convertToDto);
    }

    /**
     * 查询某本书当前可借的副本。
     */
    @Override
    @Transactional(readOnly = true)
    public List<BookCopyDto> getAvailableCopiesByBookId(Integer bookId) {
        return bookCopyRepository.findAvailableCopiesByBookId(bookId).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * 将副本实体整理为前端消费的 DTO。
     */
    private BookCopyDto convertToDto(BookCopy copy) {
        return BookCopyDto.builder()
                .id(copy.getCopyId())
                .bookId(copy.getBook().getBookId())
                .bookTitle(copy.getBook().getTitle())
                .isbn(copy.getBook().getIsbn())
                .status(copy.getStatus())
                .acquisitionDate(copy.getAcquisitionDate())
                .price(copy.getPrice())
                .notes(copy.getNotes())
                .locationCode(copy.getLocationCode())
                .rfidTag(copy.getRfidTag())
                .floorPlanId(copy.getFloorPlanId())
                .createTime(copy.getCreateTime())
                .updateTime(copy.getUpdateTime())
                .build();
    }

    private String normalizeBlank(String value) {
        if (value == null) {
            return null;
        }
        // 位置码、RFID 等可选字段遇到空字符串时统一收敛为 null，便于后续过滤。
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
