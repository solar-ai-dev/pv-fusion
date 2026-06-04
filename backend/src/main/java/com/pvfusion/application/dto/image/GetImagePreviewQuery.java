package com.pvfusion.application.dto.image;

public record GetImagePreviewQuery(
        Long actorUserId,
        Long imageId,
        String mode
) {
}
