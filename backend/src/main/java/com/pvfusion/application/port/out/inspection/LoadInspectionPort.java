package com.pvfusion.application.port.out.inspection;

import com.pvfusion.application.dto.inspection.InspectionListQuery;
import com.pvfusion.domain.inspection.Inspection;
import java.util.List;
import java.util.Optional;

public interface LoadInspectionPort {

    Optional<Inspection> loadInspection(Long inspectionId);

    List<Inspection> loadInspections(InspectionListQuery query);

    long countInspections(InspectionListQuery query);
}
