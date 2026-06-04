package com.pvfusion.application.port.out.analysis;

import com.pvfusion.domain.analysis.AnalysisJob;

public interface SaveAnalysisJobPort {

    AnalysisJob saveAnalysisJob(AnalysisJob analysisJob);
}
