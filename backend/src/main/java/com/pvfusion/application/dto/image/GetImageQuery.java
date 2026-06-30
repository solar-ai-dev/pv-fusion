package com.pvfusion.application.dto.image;

public record GetImageQuery(
        Long actorUserId,
        Long imageId
) {
    public GetImageQuery(Long imageId) {
        this(null, imageId);
    }
}
