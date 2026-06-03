package com.pvfusion.global.response;

import java.util.List;
import org.springframework.data.domain.Page;

public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext
) {

    public static <T> PageResponse<T> of(
            List<T> content,
            int page,
            int size,
            long totalElements,
            int totalPages,
            boolean hasNext
    ) {
        return new PageResponse<>(content, page, size, totalElements, totalPages, hasNext);
    }

    public static <T> PageResponse<T> from(Page<T> page) {
        return of(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.hasNext()
        );
    }
}
