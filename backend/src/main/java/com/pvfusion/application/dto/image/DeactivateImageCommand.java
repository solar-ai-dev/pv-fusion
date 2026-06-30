package com.pvfusion.application.dto.image;

public record DeactivateImageCommand(
        Long actorUserId,
        Long imageId
) {
    public DeactivateImageCommand(Long imageId) {
        this(null, imageId);
    }
}
