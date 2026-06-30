package com.pvfusion.application.dto.image;

public record GetImagePreviewQuery(
        Long actorUserId,
        Long imageId,
        String mode
) {
    public GetImagePreviewQuery(Long imageId, String mode) {
        this(null, imageId, mode);
    }
}
