package com.pvfusion.application.port.in.result;

import com.pvfusion.application.dto.result.GetResultVisualizationQuery;
import com.pvfusion.application.dto.result.ResultVisualizationResponse;

public interface GetResultVisualizationUseCase {

    ResultVisualizationResponse execute(GetResultVisualizationQuery query);
}
