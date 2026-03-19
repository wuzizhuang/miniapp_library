package com.example.library.repository;

import com.example.library.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for category queries.
 */
@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {

    /**
     * Returns root categories that are not deleted.
     */
    List<Category> findByParentIsNullAndDeletedFalse();

    /**
     * Returns child categories for a parent that are not deleted.
     */
    List<Category> findByParentCategoryIdAndDeletedFalse(Integer parentId);

    /**
     * Returns categories that are not deleted.
     */
    List<Category> findByDeletedFalse();

    /**
     * Searches categories by name.
     */
    @Query("SELECT c FROM Category c WHERE c.name LIKE %:name%")
    List<Category> searchByName(@Param("name") String name);
}
