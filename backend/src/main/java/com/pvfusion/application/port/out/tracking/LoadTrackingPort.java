package com.pvfusion.application.port.out.tracking;

import com.pvfusion.application.dto.tracking.RepeatedAnomalyQuery;
import com.pvfusion.application.dto.tracking.TrackingQuery;
import com.pvfusion.application.dto.tracking.RepeatedAnomalyResponse;
import com.pvfusion.application.dto.tracking.TrackingSummaryResponse;
import java.util.List;

public interface LoadTrackingPort {

    List<TrackingSummaryResponse> loadTracking(TrackingQuery query);

    List<RepeatedAnomalyResponse> loadRepeatedAnomalies(RepeatedAnomalyQuery query);
}
