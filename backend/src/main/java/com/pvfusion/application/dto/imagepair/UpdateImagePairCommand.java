package com.pvfusion.application.dto.imagepair;

public record UpdateImagePairCommand(
        Long actorUserId,
        Long imagePairId,
        Long rgbImageId,
        Long thermalImageId
) {
}
