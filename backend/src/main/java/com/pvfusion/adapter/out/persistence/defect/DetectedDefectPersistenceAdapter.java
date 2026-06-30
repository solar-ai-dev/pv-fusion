package com.pvfusion.adapter.out.persistence.defect;

import com.pvfusion.application.dto.defect.DetectedDefectListQuery;
import com.pvfusion.application.port.out.defect.LoadDetectedDefectPort;
import com.pvfusion.application.port.out.defect.SaveDetectedDefectPort;
import com.pvfusion.domain.defect.DetectedDefect;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DetectedDefectPersistenceAdapter implements LoadDetectedDefectPort, SaveDetectedDefectPort {

    private final DetectedDefectJpaRepository detectedDefectJpaRepository;

    @Override
    public Optional<DetectedDefect> loadDetectedDefect(Long defectId) {
        return detectedDefectJpaRepository.findById(defectId)
                .map(DetectedDefectPersistenceMapper::toDomain);
    }

    @Override
    public List<DetectedDefect> loadDetectedDefects(DetectedDefectListQuery query) {
        return detectedDefectJpaRepository.findByAnalysisResultIdOrderByCreatedAtAscIdAsc(query.analysisResultId())
                .stream()
                .map(DetectedDefectPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public DetectedDefect saveDetectedDefect(DetectedDefect defect) {
        return DetectedDefectPersistenceMapper.toDomain(
                detectedDefectJpaRepository.save(DetectedDefectPersistenceMapper.toEntity(defect))
        );
    }
}
