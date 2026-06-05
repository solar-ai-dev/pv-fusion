package com.pvfusion.adapter.out.persistence.result;

import com.pvfusion.application.dto.result.AnalysisResultListQuery;
import com.pvfusion.application.port.out.result.LoadAnalysisResultPort;
import com.pvfusion.application.port.out.result.SaveAnalysisResultPort;
import com.pvfusion.application.port.out.result.UpdateAnalysisResultPort;
import com.pvfusion.domain.result.AnalysisResult;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AnalysisResultPersistenceAdapter implements LoadAnalysisResultPort, SaveAnalysisResultPort, UpdateAnalysisResultPort {

    private final AnalysisResultJpaRepository analysisResultJpaRepository;

    @Override
    public Optional<AnalysisResult> loadAnalysisResult(Long resultId) {
        return analysisResultJpaRepository.findById(resultId)
                .map(AnalysisResultPersistenceMapper::toDomain);
    }

    @Override
    public Optional<AnalysisResult> loadAnalysisResultByAnalysisJobId(Long analysisJobId) {
        return analysisResultJpaRepository.findByAnalysisJobId(analysisJobId)
                .map(AnalysisResultPersistenceMapper::toDomain);
    }

    @Override
    public List<AnalysisResult> loadAnalysisResults(AnalysisResultListQuery query) {
        return search(query).stream()
                .map(AnalysisResultPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public long countAnalysisResults(AnalysisResultListQuery query) {
        return search(query).getTotalElements();
    }

    @Override
    public AnalysisResult saveAnalysisResult(AnalysisResult analysisResult) {
        return AnalysisResultPersistenceMapper.toDomain(
                analysisResultJpaRepository.save(AnalysisResultPersistenceMapper.toEntity(analysisResult))
        );
    }

    @Override
    public AnalysisResult updateAnalysisResult(AnalysisResult analysisResult) {
        return AnalysisResultPersistenceMapper.toDomain(
                analysisResultJpaRepository.save(AnalysisResultPersistenceMapper.toEntity(analysisResult))
        );
    }

    private Page<AnalysisResultJpaEntity> search(AnalysisResultListQuery query) {
        return analysisResultJpaRepository.search(
                query.plantId(),
                query.zoneId(),
                query.inspectionId(),
                query.targetType() != null ? query.targetType().name() : null,
                query.equipmentId(),
                query.inputType() != null ? query.inputType().name() : null,
                query.modelType() != null ? query.modelType().name() : null,
                query.jobStatus() != null ? query.jobStatus().name() : null,
                query.resultStatus() != null ? query.resultStatus().name() : null,
                query.actionCandidate() != null ? query.actionCandidate().name() : null,
                query.severityLevel() != null ? query.severityLevel().name() : null,
                query.reviewStatus() != null ? query.reviewStatus().name() : null,
                null,
                PageRequest.of(
                        query.page(),
                        query.size(),
                        Sort.by(Sort.Order.desc("analyzedAt"), Sort.Order.desc("id"))
                )
        );
    }
}
