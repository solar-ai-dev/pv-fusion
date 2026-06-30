package com.pvfusion.application.port.in.tracking;

import com.pvfusion.application.dto.tracking.RepeatedAnomalyQuery;
import com.pvfusion.application.dto.tracking.RepeatedAnomalyResponse;
import java.util.List;

public interface QueryRepeatedAnomalyUseCase {

    List<RepeatedAnomalyResponse> execute(RepeatedAnomalyQuery query);
}
