package com.pvfusion.application.dto.imagepair;

public record UpdateImagePairCommand(
        Long actorUserId,
        Long imagePairId,
        Long rgbImageId,
        Long thermalImageId
) {
    public UpdateImagePairCommand(Long imagePairId, Long rgbImageId, Long thermalImageId) {
        this(null, imagePairId, rgbImageId, thermalImageId);
    }
}
