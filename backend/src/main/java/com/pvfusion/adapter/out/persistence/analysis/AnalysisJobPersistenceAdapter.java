package com.pvfusion.adapter.out.persistence.analysis;

import com.pvfusion.application.dto.analysis.AnalysisJobListQuery;
import com.pvfusion.application.port.out.analysis.LoadAnalysisJobPort;
import com.pvfusion.application.port.out.analysis.SaveAnalysisJobPort;
import com.pvfusion.application.port.out.analysis.UpdateAnalysisJobPort;
import com.pvfusion.domain.analysis.AnalysisJob;
import com.pvfusion.domain.analysis.AnalysisJobStatus;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AnalysisJobPersistenceAdapter implements LoadAnalysisJobPort, SaveAnalysisJobPort, UpdateAnalysisJobPort {

    private final AnalysisJobJpaRepository analysisJobJpaRepository;

    @Override
    public Optional<AnalysisJob> loadAnalysisJob(Long jobId) {
        return analysisJobJpaRepository.findById(jobId)
                .map(AnalysisJobPersistenceMapper::toDomain);
    }

    @Override
    public List<AnalysisJob> loadAnalysisJobs(AnalysisJobListQuery query) {
        return analysisJobJpaRepository.search(
                        query.plantId(),
                        query.zoneId(),
                        query.inspectionId(),
                        query.jobStatus(),
                        query.inputType(),
                        query.modelType(),
                        PageRequest.of(
                                query.page(),
                                query.size(),
                                Sort.by(Sort.Order.desc("requestedAt"), Sort.Order.desc("id"))
                        )
                )
                .stream()
                .map(AnalysisJobPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public long countAnalysisJobs(AnalysisJobListQuery query) {
        return analysisJobJpaRepository.search(
                        query.plantId(),
                        query.zoneId(),
                        query.inspectionId(),
                        query.jobStatus(),
                        query.inputType(),
                        query.modelType(),
                        PageRequest.of(0, Math.max(query.size(), 1))
                )
                .getTotalElements();
    }

    @Override
    public List<AnalysisJob> loadAnalysisJobsByImageIdAndStatuses(Long imageId, List<AnalysisJobStatus> statuses) {
        return analysisJobJpaRepository.findByImageIdAndJobStatusIn(
                        imageId,
                        statuses.stream().map(Enum::name).toList()
                )
                .stream()
                .map(AnalysisJobPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public List<AnalysisJob> loadAnalysisJobsByImagePairIdAndStatuses(Long imagePairId, List<AnalysisJobStatus> statuses) {
        return analysisJobJpaRepository.findByImagePairIdAndJobStatusIn(
                        imagePairId,
                        statuses.stream().map(Enum::name).toList()
                )
                .stream()
                .map(AnalysisJobPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public AnalysisJob saveAnalysisJob(AnalysisJob analysisJob) {
        AnalysisJobJpaEntity saved = analysisJobJpaRepository.save(AnalysisJobPersistenceMapper.toEntity(analysisJob));
        return AnalysisJobPersistenceMapper.toDomain(saved);
    }

    @Override
    public AnalysisJob updateAnalysisJob(AnalysisJob analysisJob) {
        AnalysisJobJpaEntity saved = analysisJobJpaRepository.save(AnalysisJobPersistenceMapper.toEntity(analysisJob));
        return AnalysisJobPersistenceMapper.toDomain(saved);
    }
}
