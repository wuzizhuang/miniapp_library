package com.example.library.repository;

import com.example.library.entity.UserFavorite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserFavoriteRepository extends JpaRepository<UserFavorite, Long> {

    Page<UserFavorite> findByUserUserId(Integer userId, Pageable pageable);

    Optional<UserFavorite> findByUserUserIdAndBookBookId(Integer userId, Integer bookId);

    void deleteByUserUserIdAndBookBookId(Integer userId, Integer bookId);

    boolean existsByUserUserIdAndBookBookId(Integer userId, Integer bookId);

    long countByUserUserId(Integer userId);

    // ── 个人推荐所需查询 ──────────────────────────────────────────

    /** 查询用户收藏图书的所有分类 ID（去重）。 */
    @Query("SELECT DISTINCT f.book.category.categoryId FROM UserFavorite f WHERE f.user.userId = :userId AND f.book.category IS NOT NULL")
    List<Integer> findFavoriteCategoryIds(@Param("userId") Integer userId);

    /** 查询用户收藏图书的所有作者 ID（去重）。 */
    @Query("SELECT DISTINCT ba.author.authorId FROM UserFavorite f JOIN f.book.bookAuthors ba WHERE f.user.userId = :userId")
    List<Integer> findFavoriteAuthorIds(@Param("userId") Integer userId);

    /** 查询用户收藏过的所有图书 ID（去重）。 */
    @Query("SELECT DISTINCT f.book.bookId FROM UserFavorite f WHERE f.user.userId = :userId")
    List<Integer> findFavoriteBookIds(@Param("userId") Integer userId);
}
