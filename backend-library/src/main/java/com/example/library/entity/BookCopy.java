package com.example.library.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * 图书馆藏副本实体。
 * 用于表示可被借阅、预约、盘点的具体实物副本。
 */
@Entity
@Table(name = "book_copies")
@Getter
@Setter
@ToString
public class BookCopy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "copy_id")
    private Integer copyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    @ToString.Exclude
    private Book book;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CopyStatus status = CopyStatus.AVAILABLE;

    @Column(name = "acquisition_date", nullable = false)
    private LocalDate acquisitionDate;

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Lob
    @Column(length = 10000)
    private String notes;

    @CreationTimestamp
    @Column(name = "create_time", nullable = false, updatable = false)
    private LocalDateTime createTime;

    @UpdateTimestamp
    @Column(name = "update_time", nullable = false)
    private LocalDateTime updateTime;

    @OneToMany(mappedBy = "copy")
    @ToString.Exclude
    private Set<Loan> loans = new HashSet<>();

    @Column(name = "location_code", length = 50)
    private String locationCode;

    /** 副本对应的 RFID 标签编号。 */
    @Column(name = "rfid_tag", length = 64, unique = true)
    private String rfidTag;

    /** 用于定位副本所在平面图位置的标识。 */
    @Column(name = "floor_plan_id")
    private Integer floorPlanId;

    /** 副本流转状态。 */
    public enum CopyStatus {
        AVAILABLE, BORROWED, RESERVED, LOST, DAMAGED
    }
}
