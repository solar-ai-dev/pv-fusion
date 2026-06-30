package com.pvfusion.application.dto.plant;

public record DeactivatePlantCommand(
        Long actorUserId,
        Long plantId
) {
    public DeactivatePlantCommand(Long plantId) {
        this(null, plantId);
    }
}
