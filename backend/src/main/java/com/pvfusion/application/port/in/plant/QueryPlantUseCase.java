package com.pvfusion.application.port.in.plant;

import com.pvfusion.application.dto.plant.PlantListQuery;
import com.pvfusion.application.dto.plant.PlantSummaryResponse;
import com.pvfusion.global.response.PageResponse;

public interface QueryPlantUseCase {

    PageResponse<PlantSummaryResponse> execute(PlantListQuery query);
}
