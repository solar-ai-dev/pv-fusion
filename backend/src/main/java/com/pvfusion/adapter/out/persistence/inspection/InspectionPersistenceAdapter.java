package com.pvfusion.adapter.out.persistence.inspection;

import com.pvfusion.application.dto.inspection.InspectionListQuery;
import com.pvfusion.application.port.out.inspection.LoadInspectionPort;
import com.pvfusion.application.port.out.inspection.SaveInspectionPort;
import com.pvfusion.application.port.out.inspection.UpdateInspectionPort;
import com.pvfusion.domain.inspection.Inspection;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class InspectionPersistenceAdapter implements LoadInspectionPort, SaveInspectionPort, UpdateInspectionPort {

    private final InspectionJpaRepository inspectionJpaRepository;

    @Override
    public Optional<Inspection> loadInspection(Long inspectionId) {
        return inspectionJpaRepository.findById(inspectionId)
                .map(InspectionPersistenceMapper::toDomain);
    }

    @Override
    public List<Inspection> loadInspections(InspectionListQuery query) {
        return inspectionJpaRepository.search(
                        query.plantId(),
                        query.zoneId(),
                        query.inspectionStatus() != null ? query.inspectionStatus().name() : null,
                        query.from(),
                        query.to(),
                        PageRequest.of(
                                query.page(),
                                query.size(),
                                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))
                        )
                )
                .stream()
                .map(InspectionPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public long countInspections(InspectionListQuery query) {
        return inspectionJpaRepository.search(
                        query.plantId(),
                        query.zoneId(),
                        query.inspectionStatus() != null ? query.inspectionStatus().name() : null,
                        query.from(),
                        query.to(),
                        PageRequest.of(0, Math.max(query.size(), 1))
                )
                .getTotalElements();
    }

    @Override
    public Inspection saveInspection(Inspection inspection) {
        InspectionJpaEntity saved = inspectionJpaRepository.save(InspectionPersistenceMapper.toEntity(inspection));
        return InspectionPersistenceMapper.toDomain(saved);
    }

    @Override
    public Inspection updateInspection(Inspection inspection) {
        InspectionJpaEntity saved = inspectionJpaRepository.save(InspectionPersistenceMapper.toEntity(inspection));
        return InspectionPersistenceMapper.toDomain(saved);
    }
}
