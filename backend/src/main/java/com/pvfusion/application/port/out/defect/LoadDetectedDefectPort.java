package com.pvfusion.application.port.out.defect;

import com.pvfusion.application.dto.defect.DetectedDefectListQuery;
import com.pvfusion.domain.defect.DetectedDefect;
import java.util.List;
import java.util.Optional;

public interface LoadDetectedDefectPort {

    Optional<DetectedDefect> loadDetectedDefect(Long defectId);

    List<DetectedDefect> loadDetectedDefects(DetectedDefectListQuery query);
}
