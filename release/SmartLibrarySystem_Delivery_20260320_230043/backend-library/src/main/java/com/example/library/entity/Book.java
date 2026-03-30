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
 * 图书实体。
 * 描述图书基础书目数据，以及与出版社、分类、作者、副本之间的关联关系。
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

    /** 图书资源形态，例如仅纸质、仅电子或纸电混合。 */
    @Enumerated(EnumType.STRING)
    @Column(name = "resource_mode", length = 20)
    private ResourceMode resourceMode = ResourceMode.PHYSICAL_ONLY;

    /** 电子资源访问地址。 */
    @Column(name = "online_access_url", length = 500)
    private String onlineAccessUrl;

    /** 电子资源访问方式。 */
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

    /** 图书记录状态。 */
    public enum BookStatus {
        ACTIVE, INACTIVE
    }

    /** 图书资源形态枚举。 */
    public enum ResourceMode {
        PHYSICAL_ONLY, DIGITAL_ONLY, HYBRID
    }

    /** 电子资源访问权限类型。 */
    public enum OnlineAccessType {
        OPEN_ACCESS, CAMPUS_ONLY, LICENSED_ACCESS
    }
}
