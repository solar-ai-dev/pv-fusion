package com.pvfusion.adapter.in.web.plant;

import com.pvfusion.domain.plant.PlantMemberRole;
import jakarta.validation.constraints.NotNull;

public record ChangePlantMemberRoleRequest(
        @NotNull PlantMemberRole memberRole
) {
}
