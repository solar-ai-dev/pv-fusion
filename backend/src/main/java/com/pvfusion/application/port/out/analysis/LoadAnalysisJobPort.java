package com.pvfusion.application.port.out.analysis;

import com.pvfusion.application.dto.analysis.AnalysisJobListQuery;
import com.pvfusion.domain.analysis.AnalysisJob;
import java.util.List;
import java.util.Optional;

public interface LoadAnalysisJobPort {

    Optional<AnalysisJob> loadAnalysisJob(Long jobId);

    List<AnalysisJob> loadAnalysisJobs(AnalysisJobListQuery query);

    long countAnalysisJobs(AnalysisJobListQuery query);
}
