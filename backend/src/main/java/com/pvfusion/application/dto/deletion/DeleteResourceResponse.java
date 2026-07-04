package com.pvfusion.application.dto.deletion;

public record DeleteResourceResponse(
        String resourceType,
        Long resourceId,
        String resourceName
) {
}
