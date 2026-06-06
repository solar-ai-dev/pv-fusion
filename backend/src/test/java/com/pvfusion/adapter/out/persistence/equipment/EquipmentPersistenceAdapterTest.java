package com.pvfusion.adapter.out.persistence.equipment;

import static org.assertj.core.api.Assertions.assertThat;

import com.pvfusion.adapter.out.persistence.plant.PlantPersistenceAdapter;
import com.pvfusion.adapter.out.persistence.plant.PlantPersistenceMapper;
import com.pvfusion.adapter.out.persistence.user.UserPersistenceAdapter;
import com.pvfusion.adapter.out.persistence.user.UserPersistenceMapper;
import com.pvfusion.adapter.out.persistence.zone.ZonePersistenceAdapter;
import com.pvfusion.adapter.out.persistence.zone.ZonePersistenceMapper;
import com.pvfusion.application.dto.equipment.EquipmentListQuery;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.equipment.Equipment;
import com.pvfusion.domain.equipment.EquipmentType;
import com.pvfusion.domain.plant.Plant;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.user.UserRole;
import com.pvfusion.domain.zone.Zone;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
@Import({
        UserPersistenceAdapter.class,
        UserPersistenceMapper.class,
        PlantPersistenceAdapter.class,
        PlantPersistenceMapper.class,
        ZonePersistenceAdapter.class,
        ZonePersistenceMapper.class,
        EquipmentPersistenceAdapter.class,
        EquipmentPersistenceMapper.class
})
class EquipmentPersistenceAdapterTest {

    @Autowired
    private UserPersistenceAdapter userPersistenceAdapter;
    @Autowired
    private PlantPersistenceAdapter plantPersistenceAdapter;
    @Autowired
    private ZonePersistenceAdapter zonePersistenceAdapter;
    @Autowired
    private EquipmentPersistenceAdapter equipmentPersistenceAdapter;

    private User ownerUser;
    private Plant plant;
    private Zone zone;

    @BeforeEach
    void setUp() {
        ownerUser = saveUser(1, "owner@example.com");
        plant = plantPersistenceAdapter.save(new Plant(
                null,
                "Plant-A",
                "Seoul",
                "desc",
                ResourceStatus.ACTIVE,
                ownerUser.getId(),
                now().minusDays(2),
                now().minusDays(1)
        ));
        zone = zonePersistenceAdapter.save(new Zone(
                null,
                plant.getId(),
                "Zone-A",
                "North",
                "desc",
                ResourceStatus.ACTIVE,
                ownerUser.getId(),
                now().minusDays(2),
                now().minusDays(1)
        ));
    }

    @Test
    void savesEquipmentAndFindsItById() {
        Equipment saved = equipmentPersistenceAdapter.save(new Equipment(
                null,
                zone.getId(),
                null,
                EquipmentType.ARRAY,
                "Array-01",
                "A01",
                ResourceStatus.ACTIVE,
                ownerUser.getId(),
                now(),
                now()
        ));

        Optional<Equipment> found = equipmentPersistenceAdapter.findById(saved.getId());

        assertThat(saved.getId()).isNotNull();
        assertThat(found).isPresent();
        assertThat(found.orElseThrow().getEquipmentType()).isEqualTo(EquipmentType.ARRAY);
    }

    @Test
    void returnsFilteredEquipmentTree() {
        Equipment array = equipmentPersistenceAdapter.save(new Equipment(
                null,
                zone.getId(),
                null,
                EquipmentType.ARRAY,
                "Array-01",
                "A01",
                ResourceStatus.ACTIVE,
                ownerUser.getId(),
                now(),
                now()
        ));
        equipmentPersistenceAdapter.save(new Equipment(
                null,
                zone.getId(),
                array.getId(),
                EquipmentType.PANEL,
                "Panel-01",
                "A01-P01",
                ResourceStatus.ACTIVE,
                ownerUser.getId(),
                now(),
                now()
        ));
        equipmentPersistenceAdapter.save(new Equipment(
                null,
                zone.getId(),
                null,
                EquipmentType.ARRAY,
                "Array-02",
                "A02",
                ResourceStatus.INACTIVE,
                ownerUser.getId(),
                now(),
                now()
        ));

        List<?> tree = equipmentPersistenceAdapter.findAll(new EquipmentListQuery(ownerUser.getId(), zone.getId(), null, ResourceStatus.ACTIVE));

        assertThat(tree).hasSize(1);
        assertThat(tree.toString()).contains("Array-01");
        assertThat(tree.toString()).contains("Panel-01");
        assertThat(tree.toString()).doesNotContain("Array-02");
    }

    @Test
    void returnsAllEquipmentByZoneIdIncludingInactive() {
        equipmentPersistenceAdapter.save(new Equipment(
                null,
                zone.getId(),
                null,
                EquipmentType.ARRAY,
                "Array-01",
                "A01",
                ResourceStatus.ACTIVE,
                ownerUser.getId(),
                now(),
                now()
        ));
        equipmentPersistenceAdapter.save(new Equipment(
                null,
                zone.getId(),
                null,
                EquipmentType.ARRAY,
                "Array-02",
                "A02",
                ResourceStatus.INACTIVE,
                ownerUser.getId(),
                now(),
                now()
        ));

        List<Equipment> equipments = equipmentPersistenceAdapter.findByZoneId(zone.getId());

        assertThat(equipments).hasSize(2);
        assertThat(equipments).extracting(Equipment::getStatus)
                .contains(ResourceStatus.ACTIVE, ResourceStatus.INACTIVE);
    }

    @Test
    void preservesCreatedAtAndUpdatedAt() {
        OffsetDateTime createdAt = OffsetDateTime.parse("2026-06-06T09:00:00+09:00");
        OffsetDateTime updatedAt = OffsetDateTime.parse("2026-06-06T10:00:00+09:00");

        Equipment saved = equipmentPersistenceAdapter.save(new Equipment(
                null,
                zone.getId(),
                null,
                EquipmentType.ARRAY,
                "Array-01",
                "A01",
                ResourceStatus.ACTIVE,
                ownerUser.getId(),
                createdAt,
                updatedAt
        ));

        Equipment found = equipmentPersistenceAdapter.findById(saved.getId()).orElseThrow();

        assertThat(found.getCreatedAt()).isEqualTo(createdAt);
        assertThat(found.getUpdatedAt()).isEqualTo(updatedAt);
    }

    private User saveUser(int index, String email) {
        OffsetDateTime now = now().plusMinutes(index);
        return userPersistenceAdapter.save(new User(
                null,
                email,
                "User " + index,
                "GOOGLE",
                "google-" + index,
                UserRole.USER,
                AccountStatus.APPROVED,
                now,
                now,
                now
        ));
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-06T08:00:00+09:00");
    }
}
