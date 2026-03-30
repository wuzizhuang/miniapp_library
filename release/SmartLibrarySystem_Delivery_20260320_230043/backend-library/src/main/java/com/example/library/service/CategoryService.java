package com.example.library.service;

import com.example.library.dto.CategoryDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Category service.
 */
public interface CategoryService {
    /**
     * Returns paged categories.
     */
    Page<CategoryDto> getAllCategories(Pageable pageable);

    /**
     * Returns a single category by id.
     */
    CategoryDto getCategoryById(Integer id);

    /**
     * Creates a category.
     */
    CategoryDto createCategory(CategoryDto categoryDto);

    /**
     * Updates a category.
     */
    CategoryDto updateCategory(Integer id, CategoryDto categoryDto);

    /**
     * Deletes a category.
     */
    void deleteCategory(Integer id);
}
