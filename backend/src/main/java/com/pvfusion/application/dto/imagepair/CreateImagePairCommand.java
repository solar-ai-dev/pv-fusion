package com.pvfusion.application.dto.imagepair;

public record CreateImagePairCommand(
        Long actorUserId,
        Long rgbImageId,
        Long thermalImageId
) {
    public CreateImagePairCommand(Long rgbImageId, Long thermalImageId) {
        this(null, rgbImageId, thermalImageId);
    }
}
