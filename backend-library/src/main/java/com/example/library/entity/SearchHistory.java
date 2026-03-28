package com.example.library.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

/**
 * 搜索历史实体。
 * 记录用户或匿名场景下的一次搜索关键词及结果数量。
 */
@Entity
@Table(name = "search_history")
@Data
public class SearchHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long searchId;

    @Column(name = "user_id")
    private Integer userId;

    @Column(nullable = false, length = 100)
    private String keyword;

    @Column(name = "result_count")
    private Integer resultCount;

    @CreationTimestamp
    private LocalDateTime searchTime;
}
