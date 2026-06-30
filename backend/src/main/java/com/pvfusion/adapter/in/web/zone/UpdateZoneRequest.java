package com.pvfusion.adapter.in.web.zone;

import jakarta.validation.constraints.NotBlank;

public record UpdateZoneRequest(
        @NotBlank String name,
        String location,
        String description
) {
}
