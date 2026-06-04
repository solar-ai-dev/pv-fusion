package com.pvfusion.application.port.out.analysis;

import com.pvfusion.application.dto.analysis.AnalysisJobMessage;

public interface PublishAnalysisJobPort {

    void publish(AnalysisJobMessage message);
}
