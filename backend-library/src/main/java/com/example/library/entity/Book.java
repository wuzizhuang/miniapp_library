package com.example.library.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Book entity.
 */
@Entity
@Table(name = "books")
@Getter
@Setter
@ToString
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "book_id")
    private Integer bookId;

    @Column(name = "isbn", nullable = false, unique = true, length = 20)
    private String isbn;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "cover_url")
    private String coverUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "resource_mode", length = 20)
    private ResourceMode resourceMode = ResourceMode.PHYSICAL_ONLY;

    @Column(name = "online_access_url", length = 500)
    private String onlineAccessUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "online_access_type", length = 30)
    private OnlineAccessType onlineAccessType;

    @Lob
    @Column(length = 10000)
    private String description;

    @Column(name = "page_count")
    private Integer pageCount;

    @Column(name = "published_year", nullable = false)
    private Integer publishedYear;

    @Column(name = "language", nullable = false, length = 50)
    private String language;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publisher_id")
    @ToString.Exclude
    private Publisher publisher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    @ToString.Exclude
    private Category category;

    @CreationTimestamp
    @Column(name = "create_time", nullable = false, updatable = false)
    private LocalDateTime createTime;

    @UpdateTimestamp
    @Column(name = "update_time", nullable = false)
    private LocalDateTime updateTime;

    @OneToMany(mappedBy = "book")
    @ToString.Exclude
    private Set<BookCopy> copies = new HashSet<>();

    @OneToMany(mappedBy = "book")
    @ToString.Exclude
    private Set<BookAuthor> bookAuthors = new HashSet<>();

    @OneToMany(mappedBy = "book")
    @ToString.Exclude
    private Set<Reservation> reservations = new HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private BookStatus status = BookStatus.ACTIVE;

    public enum BookStatus {
        ACTIVE, INACTIVE
    }

    public enum ResourceMode {
        PHYSICAL_ONLY, DIGITAL_ONLY, HYBRID
    }

    public enum OnlineAccessType {
        OPEN_ACCESS, CAMPUS_ONLY, LICENSED_ACCESS
    }
}
