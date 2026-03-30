package com.example.library.exception;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.ArrayList;
import java.util.List;
/**
 * Generic API response wrapper.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {
    private T data;
    private boolean success;
    private List<String> messages = new ArrayList<>();
    private boolean hasWarnings;

    /**
     * Creates a successful response with data.
     */
    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .data(data)
                .success(true)
                .build();
    }

    /**
     * Creates a failure response with a message.
     */
    public static <T> ApiResponse<T> failure(String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setSuccess(false);
        response.getMessages().add(message);
        return response;
    }

    /**
     * Adds a warning message and marks response as having warnings.
     */
    public ApiResponse<T> addWarning(String warning) {
        this.setHasWarnings(true);
        this.getMessages().add("WARNING: " + warning);
        return this;
    }
}
