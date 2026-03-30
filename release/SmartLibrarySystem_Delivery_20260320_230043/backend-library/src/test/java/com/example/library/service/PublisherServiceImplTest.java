package com.example.library.service;

import com.example.library.dto.PublisherDto;
import com.example.library.entity.Publisher;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.PublisherRepository;
import com.example.library.service.impl.PublisherServiceImpl;
import com.example.library.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * PublisherServiceImpl 单元测试。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("PublisherService 单元测试")
class PublisherServiceImplTest {

    @Mock
    private PublisherRepository publisherRepository;

    @InjectMocks
    private PublisherServiceImpl publisherService;

    private Publisher publisher;

    @BeforeEach
    void setUp() {
        publisher = TestDataFactory.createPublisher(1, "机械工业出版社");
    }

    @Nested
    @DisplayName("createPublisher — 创建出版社")
    class CreatePublisher {

        @Test
        @DisplayName("成功：保存并返回 DTO")
        void success() {
            PublisherDto dto = new PublisherDto();
            dto.setName("新出版社");
            dto.setAddress("上海");
            dto.setContactInfo("021-00000000");

            when(publisherRepository.existsByNameIgnoreCaseAndIsDeletedFalse("新出版社")).thenReturn(false);
            when(publisherRepository.save(any(Publisher.class))).thenReturn(publisher);

            PublisherDto result = publisherService.createPublisher(dto);

            assertThat(result).isNotNull();
            verify(publisherRepository).save(any(Publisher.class));
        }

        @Test
        @DisplayName("失败：名称重复，抛出 BadRequestException")
        void fail_duplicateName() {
            PublisherDto dto = new PublisherDto();
            dto.setName("机械工业出版社");

            when(publisherRepository.existsByNameIgnoreCaseAndIsDeletedFalse("机械工业出版社")).thenReturn(true);

            assertThatThrownBy(() -> publisherService.createPublisher(dto))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("already exists");

            verify(publisherRepository, never()).save(any(Publisher.class));
        }
    }

    @Nested
    @DisplayName("getPublisherById — 按 ID 查询")
    class GetById {

        @Test
        @DisplayName("成功：返回 DTO")
        void success() {
            when(publisherRepository.findByPublisherIdAndIsDeletedFalse(1)).thenReturn(Optional.of(publisher));

            PublisherDto result = publisherService.getPublisherById(1);

            assertThat(result.getPublisherId()).isEqualTo(1);
            assertThat(result.getName()).isEqualTo("机械工业出版社");
        }

        @Test
        @DisplayName("失败：不存在，抛出 ResourceNotFoundException")
        void notFound() {
            when(publisherRepository.findByPublisherIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> publisherService.getPublisherById(999))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("updatePublisher — 更新出版社")
    class UpdatePublisher {

        @Test
        @DisplayName("成功：字段更新，保存并返回")
        void success() {
            PublisherDto dto = new PublisherDto();
            dto.setName("更新的出版社");
            dto.setAddress("北京");
            dto.setContactInfo("010-99999999");

            when(publisherRepository.findByPublisherIdAndIsDeletedFalse(1)).thenReturn(Optional.of(publisher));
            when(publisherRepository.existsByNameIgnoreCaseAndPublisherIdNotAndIsDeletedFalse("更新的出版社", 1))
                    .thenReturn(false);
            when(publisherRepository.save(any(Publisher.class))).thenReturn(publisher);

            PublisherDto result = publisherService.updatePublisher(1, dto);

            assertThat(publisher.getName()).isEqualTo("更新的出版社");
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("失败：不存在，抛出 ResourceNotFoundException")
        void notFound() {
            when(publisherRepository.findByPublisherIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> publisherService.updatePublisher(999, new PublisherDto()))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("失败：名称重复，抛出 BadRequestException")
        void duplicateName() {
            PublisherDto dto = new PublisherDto();
            dto.setName("机械工业出版社");

            when(publisherRepository.findByPublisherIdAndIsDeletedFalse(1)).thenReturn(Optional.of(publisher));
            when(publisherRepository.existsByNameIgnoreCaseAndPublisherIdNotAndIsDeletedFalse("机械工业出版社", 1))
                    .thenReturn(true);

            assertThatThrownBy(() -> publisherService.updatePublisher(1, dto))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("already exists");

            verify(publisherRepository, never()).save(any(Publisher.class));
        }
    }

    @Nested
    @DisplayName("deletePublisher — 软删除")
    class DeletePublisher {

        @Test
        @DisplayName("成功：isDeleted=true，名称追加 _DELETED_ 后缀")
        void success_softDelete() {
            when(publisherRepository.findByPublisherIdAndIsDeletedFalse(1)).thenReturn(Optional.of(publisher));

            publisherService.deletePublisher(1);

            assertThat(publisher.getIsDeleted()).isTrue();
            assertThat(publisher.getName()).contains("_DELETED_");
            verify(publisherRepository).save(publisher);
        }

        @Test
        @DisplayName("失败：不存在，抛出 ResourceNotFoundException")
        void notFound() {
            when(publisherRepository.findByPublisherIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> publisherService.deletePublisher(999))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("getAllPublishers — 查询全部")
    class GetAll {

        @Test
        @DisplayName("成功：返回列表")
        void success() {
            when(publisherRepository.findByIsDeletedFalseOrderByNameAsc()).thenReturn(List.of(publisher));

            assertThat(publisherService.getAllPublishers()).hasSize(1);
        }
    }
}
