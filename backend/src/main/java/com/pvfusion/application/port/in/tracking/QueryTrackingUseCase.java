package com.pvfusion.application.port.in.tracking;

import com.pvfusion.application.dto.tracking.TrackingQuery;
import com.pvfusion.application.dto.tracking.TrackingResponse;

public interface QueryTrackingUseCase {

    TrackingResponse execute(TrackingQuery query);
}
