package com.example.library.service;

import com.example.library.dto.book.BookLocationMapDto;
import com.example.library.entity.Book;
import com.example.library.entity.BookCopy;
import com.example.library.repository.BookCopyRepository;
import com.example.library.repository.BookRepository;
import com.example.library.service.impl.BookLocationMapServiceImpl;
import com.example.library.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("BookLocationMapService 单元测试")
class BookLocationMapServiceImplTest {

    @Mock
    private BookRepository bookRepository;

    @Mock
    private BookCopyRepository bookCopyRepository;

    @InjectMocks
    private BookLocationMapServiceImpl bookLocationMapService;

    private Book book;

    @BeforeEach
    void setUp() {
        book = TestDataFactory.createBook(10, "算法导论", "978-7-111-12345-6");
    }

    @Test
    @DisplayName("成功：根据副本位置生成默认楼层地图")
    void shouldGenerateDefaultMapFromCopies() {
        BookCopy copyA1 = TestDataFactory.createAvailableCopy(1, book);
        copyA1.setLocationCode("3F-A-12");
        copyA1.setFloorPlanId(3);

        BookCopy copyA2 = TestDataFactory.createCopy(2, book, BookCopy.CopyStatus.BORROWED);
        copyA2.setLocationCode("3F-A-12");
        copyA2.setFloorPlanId(3);

        BookCopy copyC1 = TestDataFactory.createAvailableCopy(3, book);
        copyC1.setLocationCode("4F-C-03");
        copyC1.setFloorPlanId(4);

        when(bookRepository.findById(10)).thenReturn(Optional.of(book));
        when(bookCopyRepository.findByBookBookId(10)).thenReturn(List.of(copyA1, copyA2, copyC1));

        BookLocationMapDto result = bookLocationMapService.getBookLocationMap(10);

        assertThat(result.getBookId()).isEqualTo(10);
        assertThat(result.getHighlightedFloorPlanId()).isEqualTo(3);
        assertThat(result.getFloors()).hasSize(2);
        assertThat(result.getLocations()).hasSize(3);
        assertThat(result.getFloors().get(0).getShelves())
                .anySatisfy(shelf -> {
                    assertThat(shelf.getShelfCode()).isEqualTo("A-12");
                    assertThat(shelf.getCopyCount()).isEqualTo(2);
                    assertThat(shelf.getAvailableCopyCount()).isEqualTo(1);
                });
    }
}
