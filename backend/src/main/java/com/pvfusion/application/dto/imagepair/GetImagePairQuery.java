package com.pvfusion.application.dto.imagepair;

public record GetImagePairQuery(
        Long actorUserId,
        Long imagePairId
) {
    public GetImagePairQuery(Long imagePairId) {
        this(null, imagePairId);
    }
}
