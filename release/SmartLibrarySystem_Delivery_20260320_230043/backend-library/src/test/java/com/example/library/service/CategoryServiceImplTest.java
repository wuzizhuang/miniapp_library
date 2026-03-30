package com.example.library.service;

import com.example.library.dto.CategoryDto;
import com.example.library.entity.Category;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.CategoryRepository;
import com.example.library.service.impl.CategoryServiceImpl;
import com.example.library.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * CategoryServiceImpl 单元测试。
 *
 * <p>
 * 覆盖：父子分类关系、自引用校验（自身不能为自身的父节点）、有子分类时禁止删除。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("CategoryService 单元测试")
class CategoryServiceImplTest {

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private CategoryServiceImpl categoryService;

    private Category parentCategory;
    private Category childCategory;

    @BeforeEach
    void setUp() {
        parentCategory = TestDataFactory.createCategory(1, "计算机科学");
        childCategory = TestDataFactory.createCategory(2, "Java 编程");
        childCategory.setParent(parentCategory);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // getCategoryById
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("getCategoryById")
    class GetById {

        @Test
        @DisplayName("成功：返回带父分类信息的 DTO")
        void success_withParent() {
            when(categoryRepository.findById(2)).thenReturn(Optional.of(childCategory));

            CategoryDto result = categoryService.getCategoryById(2);

            assertThat(result.getCategoryId()).isEqualTo(2);
            assertThat(result.getName()).isEqualTo("Java 编程");
            assertThat(result.getParentId()).isEqualTo(1);
            assertThat(result.getParentName()).isEqualTo("计算机科学");
        }

        @Test
        @DisplayName("失败：不存在，抛出 ResourceNotFoundException")
        void notFound() {
            when(categoryRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> categoryService.getCategoryById(999))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // createCategory
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("createCategory — 创建分类")
    class CreateCategory {

        @Test
        @DisplayName("成功：无父分类")
        void success_noParent() {
            CategoryDto dto = new CategoryDto();
            dto.setName("新分类");
            dto.setDescription("描述");

            when(categoryRepository.save(any(Category.class))).thenReturn(parentCategory);

            CategoryDto result = categoryService.createCategory(dto);

            assertThat(result).isNotNull();
            verify(categoryRepository).save(any(Category.class));
        }

        @Test
        @DisplayName("成功：指定父分类")
        void success_withParent() {
            CategoryDto dto = new CategoryDto();
            dto.setName("子分类");
            dto.setParentId(1);

            when(categoryRepository.findById(1)).thenReturn(Optional.of(parentCategory));
            when(categoryRepository.save(any(Category.class))).thenReturn(childCategory);

            CategoryDto result = categoryService.createCategory(dto);

            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("失败：父分类不存在，抛出 ResourceNotFoundException")
        void fail_parentNotFound() {
            CategoryDto dto = new CategoryDto();
            dto.setName("子分类");
            dto.setParentId(999);

            when(categoryRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> categoryService.createCategory(dto))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // updateCategory
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("updateCategory — 更新分类")
    class UpdateCategory {

        @Test
        @DisplayName("成功：更新名称和描述")
        void success() {
            CategoryDto dto = new CategoryDto();
            dto.setName("更新的名称");
            dto.setDescription("更新的描述");

            when(categoryRepository.findById(1)).thenReturn(Optional.of(parentCategory));
            when(categoryRepository.save(any(Category.class))).thenReturn(parentCategory);

            CategoryDto result = categoryService.updateCategory(1, dto);

            assertThat(parentCategory.getName()).isEqualTo("更新的名称");
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("失败：设置自身为父节点，抛出 IllegalArgumentException")
        void fail_selfAsParent() {
            CategoryDto dto = new CategoryDto();
            dto.setName("A");
            dto.setParentId(1); // 与 id=1 相同

            when(categoryRepository.findById(1)).thenReturn(Optional.of(parentCategory));

            assertThatThrownBy(() -> categoryService.updateCategory(1, dto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("itself as parent");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // deleteCategory
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("deleteCategory — 软删除")
    class DeleteCategory {

        @Test
        @DisplayName("成功：无子分类，执行软删除")
        void success_noChildren() {
            when(categoryRepository.findById(1)).thenReturn(Optional.of(parentCategory));
            when(categoryRepository.findByParentCategoryIdAndDeletedFalse(1)).thenReturn(List.of());

            categoryService.deleteCategory(1);

            assertThat(parentCategory.getDeleted()).isTrue();
            assertThat(parentCategory.getName()).contains("_DEL_");
            verify(categoryRepository).save(parentCategory);
        }

        @Test
        @DisplayName("失败：有子分类，抛出 IllegalStateException")
        void fail_hasChildren() {
            when(categoryRepository.findById(1)).thenReturn(Optional.of(parentCategory));
            when(categoryRepository.findByParentCategoryIdAndDeletedFalse(1)).thenReturn(List.of(childCategory));

            assertThatThrownBy(() -> categoryService.deleteCategory(1))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("sub-categories");

            verify(categoryRepository, never()).save(any(Category.class));
        }
    }
}
