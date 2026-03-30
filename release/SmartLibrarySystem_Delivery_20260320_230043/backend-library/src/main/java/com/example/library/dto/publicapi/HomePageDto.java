package com.example.library.dto.publicapi;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Public homepage payload.
 */
@Data
public class HomePageDto {
    private List<StatItem> heroStats = new ArrayList<>();
    private List<BookItem> featuredBooks = new ArrayList<>();
    private List<BookItem> newArrivals = new ArrayList<>();
    private List<CategoryItem> categories = new ArrayList<>();

    @Data
    public static class StatItem {
        private String label;
        private Long value;
    }

    @Data
    public static class BookItem {
        private Integer id;
        private String title;
        private String author;
        private String cover;
        private String tag;
    }

    @Data
    public static class CategoryItem {
        private Integer categoryId;
        private String label;
        private Long count;
    }
}
