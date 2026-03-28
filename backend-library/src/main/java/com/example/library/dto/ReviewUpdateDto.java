package com.example.library.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 编辑评论请求 DTO。
 * 与新建评论分离，避免更新时重复要求 bookId / loanId。
 */
@Data
public class ReviewUpdateDto {
    @NotNull(message = "评分不能为空")
    @Min(value = 1, message = "评分不能低于 1 分")
    @Max(value = 5, message = "评分不能高于 5 分")
    private Integer rating;

    @Size(max = 500, message = "评论内容不能超过 500 字")
    private String commentText;
}
