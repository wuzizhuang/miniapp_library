package com.example.library.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Join entity for book-author relationships.
 */
@Entity
@Table(name = "book_authors")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class BookAuthor implements Comparable<BookAuthor> {

    @EmbeddedId
    private BookAuthorId id = new BookAuthorId();

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("bookId")
    @JoinColumn(name = "book_id")
    @ToString.Exclude
    private Book book;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("authorId")
    @JoinColumn(name = "author_id")
    @ToString.Exclude
    private Author author;

    @Column(name = "author_order", nullable = false)
    private Integer authorOrder;

    @CreationTimestamp
    @Column(name = "create_time", nullable = false, updatable = false)
    private LocalDateTime createTime;

    public BookAuthor(Book book, Author author, Integer authorOrder) {
        this.book = book;
        this.author = author;
        this.authorOrder = authorOrder;
        this.id = new BookAuthorId();
        this.id.setBookId(book.getBookId());
        this.id.setAuthorId(author.getAuthorId());
    }

    @Override
    public int compareTo(BookAuthor other) {
        return this.authorOrder.compareTo(other.authorOrder);
    }

    @Embeddable
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BookAuthorId implements Serializable {
        @Column(name = "book_id")
        private Integer bookId;

        @Column(name = "author_id")
        private Integer authorId;
    }
}
