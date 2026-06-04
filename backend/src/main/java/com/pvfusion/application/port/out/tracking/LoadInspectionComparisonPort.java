package com.pvfusion.application.port.out.tracking;

import com.pvfusion.application.dto.tracking.InspectionCompareQuery;
import com.pvfusion.application.dto.tracking.InspectionCompareResponse;
import java.util.Optional;

public interface LoadInspectionComparisonPort {

    Optional<InspectionCompareResponse> loadInspectionComparison(InspectionCompareQuery query);
}
