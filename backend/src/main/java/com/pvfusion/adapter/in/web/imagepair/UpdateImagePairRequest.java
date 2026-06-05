package com.pvfusion.adapter.in.web.imagepair;

public record UpdateImagePairRequest(
        Long rgbImageId,
        Long thermalImageId
) {
}
