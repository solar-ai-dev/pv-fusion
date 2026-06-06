package com.pvfusion.adapter.out.persistence.equipment;

import com.pvfusion.application.dto.equipment.EquipmentListQuery;
import com.pvfusion.application.dto.equipment.EquipmentTreeResponse;
import com.pvfusion.application.port.out.equipment.EquipmentRepositoryPort;
import com.pvfusion.application.port.out.equipment.LoadEquipmentPort;
import com.pvfusion.application.port.out.equipment.SaveEquipmentPort;
import com.pvfusion.domain.equipment.Equipment;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EquipmentPersistenceAdapter implements EquipmentRepositoryPort, LoadEquipmentPort, SaveEquipmentPort {

    private final EquipmentJpaRepository equipmentJpaRepository;
    private final EquipmentPersistenceMapper equipmentPersistenceMapper;

    @Override
    public List<EquipmentTreeResponse> findAll(EquipmentListQuery query) {
        List<EquipmentJpaEntity> entities = equipmentJpaRepository.findByZoneIdOrderByIdDesc(query.zoneId()).stream()
                .filter(entity -> query.equipmentType() == null || entity.getEquipmentType() == query.equipmentType())
                .filter(entity -> query.status() == null || entity.getStatus() == query.status())
                .toList();

        return buildTree(entities);
    }

    @Override
    public Optional<Equipment> findById(Long equipmentId) {
        return equipmentJpaRepository.findById(equipmentId).map(equipmentPersistenceMapper::toDomain);
    }

    @Override
    public List<Equipment> findByZoneId(Long zoneId) {
        return equipmentJpaRepository.findByZoneIdOrderByIdDesc(zoneId).stream()
                .map(equipmentPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional
    public Equipment save(Equipment equipment) {
        EquipmentJpaEntity entity = equipment.getId() == null
                ? equipmentPersistenceMapper.toEntity(equipment)
                : equipmentJpaRepository.findById(equipment.getId())
                        .map(existing -> equipmentPersistenceMapper.updateEntity(equipment, existing))
                        .orElseGet(() -> equipmentPersistenceMapper.toEntity(equipment));

        return equipmentPersistenceMapper.toDomain(equipmentJpaRepository.save(entity));
    }

    @Override
    public Optional<Equipment> loadEquipment(Long equipmentId) {
        return findById(equipmentId);
    }

    @Override
    public List<Equipment> loadEquipments(EquipmentListQuery query) {
        return equipmentJpaRepository.findByZoneIdOrderByIdDesc(query.zoneId()).stream()
                .filter(entity -> query.equipmentType() == null || entity.getEquipmentType() == query.equipmentType())
                .filter(entity -> query.status() == null || entity.getStatus() == query.status())
                .map(equipmentPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional
    public Equipment saveEquipment(Equipment equipment) {
        return save(equipment);
    }

    private List<EquipmentTreeResponse> buildTree(List<EquipmentJpaEntity> entities) {
        Map<Long, TreeNode> nodes = new LinkedHashMap<>();
        for (EquipmentJpaEntity entity : entities) {
            nodes.put(entity.getId(), new TreeNode(entity));
        }

        List<TreeNode> roots = new ArrayList<>();
        for (TreeNode node : nodes.values()) {
            Long parentId = node.entity().getParentEquipmentId();
            TreeNode parentNode = parentId == null ? null : nodes.get(parentId);
            if (parentNode == null) {
                roots.add(node);
            } else {
                parentNode.children().add(node);
            }
        }

        return roots.stream().map(this::toTreeResponse).toList();
    }

    private EquipmentTreeResponse toTreeResponse(TreeNode node) {
        return new EquipmentTreeResponse(
                node.entity().getId(),
                node.entity().getZoneId(),
                node.entity().getParentEquipmentId(),
                node.entity().getEquipmentType(),
                node.entity().getName(),
                node.entity().getPositionCode(),
                node.entity().getStatus(),
                node.children().stream().map(this::toTreeResponse).toList()
        );
    }

    private record TreeNode(EquipmentJpaEntity entity, List<TreeNode> children) {
        private TreeNode(EquipmentJpaEntity entity) {
            this(entity, new ArrayList<>());
        }
    }
}
