package com.pvfusion.application.dto.imagepair;

public record DeactivateImagePairCommand(
        Long actorUserId,
        Long imagePairId
) {
}
