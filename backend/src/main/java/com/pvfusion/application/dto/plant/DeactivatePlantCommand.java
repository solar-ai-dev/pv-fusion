package com.pvfusion.application.dto.plant;

public record DeactivatePlantCommand(
        Long actorUserId,
        Long plantId
) {
}
