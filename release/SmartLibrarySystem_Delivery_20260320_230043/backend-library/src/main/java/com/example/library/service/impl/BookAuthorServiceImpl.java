package com.example.library.service.impl;

import com.example.library.dto.AuthorDto;
import com.example.library.dto.book.BookDetailDto;
import com.example.library.entity.Author;
import com.example.library.entity.Book;
import com.example.library.entity.BookAuthor;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.AuthorRepository;
import com.example.library.repository.BookAuthorRepository;
import com.example.library.repository.BookRepository;
import com.example.library.service.BookAuthorService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Default implementation for managing book-author relations.
 */
@Service
public class BookAuthorServiceImpl implements BookAuthorService {

    private final BookAuthorRepository bookAuthorRepository;
    private final BookRepository bookRepository;
    private final AuthorRepository authorRepository;

    public BookAuthorServiceImpl(BookAuthorRepository bookAuthorRepository,
            BookRepository bookRepository,
            AuthorRepository authorRepository) {
        this.bookAuthorRepository = bookAuthorRepository;
        this.bookRepository = bookRepository;
        this.authorRepository = authorRepository;
    }

    /**
     * Links an author to a book.
     */
    @Override
    @Transactional
    public void addAuthorToBook(Integer authorId, Integer bookId, Integer authorOrder) {
        Author author = authorRepository.findById(authorId)
                .orElseThrow(() -> new ResourceNotFoundException("Author not found with id: " + authorId));

        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));

        if (bookAuthorRepository.existsByBookBookIdAndAuthorAuthorId(bookId, authorId)) {
            throw new IllegalStateException("Author " + authorId + " is already associated with book " + bookId);
        }

        BookAuthor bookAuthor = new BookAuthor(book, author, authorOrder);
        bookAuthorRepository.save(bookAuthor);
    }

    /**
     * Returns book details with author list.
     */
    @Override
    public BookDetailDto getBookDetailDto(Integer bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));

        List<BookAuthor> bookAuthors = bookAuthorRepository.findByBookBookId(bookId);

        BookDetailDto bookDetailDto = new BookDetailDto();
        bookDetailDto.setBookId(book.getBookId());
        bookDetailDto.setTitle(book.getTitle());

        List<AuthorDto> authorDtos = new ArrayList<>();
        for (BookAuthor bookAuthor : bookAuthors) {
            Author author = bookAuthor.getAuthor();
            AuthorDto authorDto = new AuthorDto();
            authorDto.setAuthorId(author.getAuthorId());
            authorDto.setName(author.getName());
            authorDtos.add(authorDto);
        }
        bookDetailDto.setAuthors(authorDtos);

        return bookDetailDto;
    }

    /**
     * Removes an author link from a book.
     */
    @Override
    @Transactional
    public void removeAuthorFromBook(Integer authorId, Integer bookId) {
        if (!bookAuthorRepository.existsByBookBookIdAndAuthorAuthorId(bookId, authorId)) {
            throw new ResourceNotFoundException(
                    "Author " + authorId + " is not linked to book " + bookId);
        }
        BookAuthor.BookAuthorId id = new BookAuthor.BookAuthorId(bookId, authorId);
        bookAuthorRepository.deleteById(id);
    }
}
