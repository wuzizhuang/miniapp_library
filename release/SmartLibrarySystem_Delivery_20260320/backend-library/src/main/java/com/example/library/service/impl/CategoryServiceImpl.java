package com.example.library.service.impl;

import com.example.library.dto.CategoryDto;
import com.example.library.entity.Category;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.CategoryRepository;
import com.example.library.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Default category service implementation.
 */
@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;

    /**
     * Returns paged categories.
     */
    @Override
    public Page<CategoryDto> getAllCategories(Pageable pageable) {
        return categoryRepository.findAll(pageable).map(this::convertToDto);
    }

    /**
     * Returns a single category by id.
     */
    @Override
    public CategoryDto getCategoryById(Integer id) {
        return categoryRepository.findById(id)
                .map(this::convertToDto)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
    }

    /**
     * Creates a category.
     */
    @Override
    @Transactional
    public CategoryDto createCategory(CategoryDto categoryDto) {
        Category category = new Category();
        category.setName(categoryDto.getName());
        category.setDescription(categoryDto.getDescription());

        if (categoryDto.getParentId() != null) {
            Category parent = categoryRepository.findById(categoryDto.getParentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent category not found"));
            category.setParent(parent);
        }

        return convertToDto(categoryRepository.save(category));
    }

    /**
     * Updates a category.
     */
    @Override
    @Transactional
    public CategoryDto updateCategory(Integer id, CategoryDto categoryDto) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        category.setName(categoryDto.getName());
        category.setDescription(categoryDto.getDescription());

        if (categoryDto.getParentId() != null) {
            if (categoryDto.getParentId().equals(id)) {
                throw new IllegalArgumentException("Cannot set category itself as parent");
            }
            Category parent = categoryRepository.findById(categoryDto.getParentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent category not found"));
            category.setParent(parent);
        } else {
            category.setParent(null);
        }

        return convertToDto(categoryRepository.save(category));
    }

    /**
     * Deletes a category via soft delete.
     */
    @Override
    @Transactional
    public void deleteCategory(Integer id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        if (!categoryRepository.findByParentCategoryIdAndDeletedFalse(id).isEmpty()) {
            throw new IllegalStateException("Cannot delete category with active sub-categories");
        }

        category.setDeleted(true);
        category.setName(category.getName() + "_DEL_" + System.currentTimeMillis());

        categoryRepository.save(category);
    }

    private CategoryDto convertToDto(Category category) {
        CategoryDto dto = new CategoryDto();
        dto.setCategoryId(category.getCategoryId());
        dto.setName(category.getName());
        dto.setDescription(category.getDescription());
        if (category.getParent() != null) {
            dto.setParentId(category.getParent().getCategoryId());
            dto.setParentName(category.getParent().getName());
        }
        return dto;
    }
}
