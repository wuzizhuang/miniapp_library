package com.example.library.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Publisher entity.
 */
@Entity
@Table(name = "publishers")
@Data
public class Publisher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "publisher_id")
    private Integer publisherId;

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "address")
    private String address;

    @Column(name = "contact_info", length = 100)
    private String contactInfo;

    @CreationTimestamp
    @Column(name = "create_time", nullable = false, updatable = false)
    private LocalDateTime createTime;

    @UpdateTimestamp
    @Column(name = "update_time", nullable = false)
    private LocalDateTime updateTime;

    @OneToMany(mappedBy = "publisher")
    private Set<Book> books = new HashSet<>();

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;
}
