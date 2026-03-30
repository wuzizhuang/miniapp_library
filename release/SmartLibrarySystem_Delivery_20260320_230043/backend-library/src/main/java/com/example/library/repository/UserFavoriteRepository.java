package com.example.library.repository;

import com.example.library.entity.UserFavorite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserFavoriteRepository extends JpaRepository<UserFavorite, Long> {

    Page<UserFavorite> findByUserUserId(Integer userId, Pageable pageable);

    Optional<UserFavorite> findByUserUserIdAndBookBookId(Integer userId, Integer bookId);

    void deleteByUserUserIdAndBookBookId(Integer userId, Integer bookId);

    boolean existsByUserUserIdAndBookBookId(Integer userId, Integer bookId);

    long countByUserUserId(Integer userId);
}
