package com.pvfusion.application.port.out.result;

import com.pvfusion.application.dto.result.AnalysisResultListQuery;
import com.pvfusion.domain.result.AnalysisResult;
import java.util.List;
import java.util.Optional;

public interface LoadAnalysisResultPort {

    Optional<AnalysisResult> loadAnalysisResult(Long resultId);

    List<AnalysisResult> loadAnalysisResults(AnalysisResultListQuery query);

    long countAnalysisResults(AnalysisResultListQuery query);
}
