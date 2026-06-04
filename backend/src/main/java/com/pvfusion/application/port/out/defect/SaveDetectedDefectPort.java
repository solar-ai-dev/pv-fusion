package com.pvfusion.application.port.out.defect;

import com.pvfusion.domain.defect.DetectedDefect;

public interface SaveDetectedDefectPort {

    DetectedDefect saveDetectedDefect(DetectedDefect defect);
}
