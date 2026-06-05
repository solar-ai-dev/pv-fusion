package com.pvfusion.adapter.in.web.imagepair;

import jakarta.validation.constraints.NotNull;

public record CreateImagePairRequest(
        @NotNull Long rgbImageId,
        @NotNull Long thermalImageId
) {
}
