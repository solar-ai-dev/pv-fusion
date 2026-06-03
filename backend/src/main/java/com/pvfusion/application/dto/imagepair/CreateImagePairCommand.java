package com.pvfusion.application.dto.imagepair;

public record CreateImagePairCommand(
        Long actorUserId,
        Long rgbImageId,
        Long thermalImageId
) {
}
