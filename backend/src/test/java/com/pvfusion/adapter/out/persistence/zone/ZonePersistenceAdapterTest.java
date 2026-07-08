package com.pvfusion.adapter.out.persistence.zone;

import static org.assertj.core.api.Assertions.assertThat;

import com.pvfusion.adapter.out.persistence.plant.PlantPersistenceAdapter;
import com.pvfusion.adapter.out.persistence.plant.PlantPersistenceMapper;
import com.pvfusion.adapter.out.persistence.user.UserPersistenceAdapter;
import com.pvfusion.adapter.out.persistence.user.UserPersistenceMapper;
import com.pvfusion.application.dto.zone.ZoneListQuery;
import com.pvfusion.domain.common.ResourceStatus;
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

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import({
        UserPersistenceAdapter.class,
        UserPersistenceMapper.class,
        PlantPersistenceAdapter.class,
        PlantPersistenceMapper.class,
        ZonePersistenceAdapter.class,
        ZonePersistenceMapper.class
})
class ZonePersistenceAdapterTest {

    @Autowired
    private UserPersistenceAdapter userPersistenceAdapter;
    @Autowired
    private PlantPersistenceAdapter plantPersistenceAdapter;
    @Autowired
    private ZonePersistenceAdapter zonePersistenceAdapter;

    private User ownerUser;
    private Plant plant;

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
    }

    @Test
    void savesZoneAndFindsItById() {
        Zone saved = zonePersistenceAdapter.save(new Zone(
                null,
                plant.getId(),
                "Zone-A",
                "North",
                "desc",
                ResourceStatus.ACTIVE,
                ownerUser.getId(),
                now(),
                now()
        ));

        Optional<Zone> found = zonePersistenceAdapter.findById(saved.getId());

        assertThat(saved.getId()).isNotNull();
        assertThat(found).isPresent();
        assertThat(found.orElseThrow().getPlantId()).isEqualTo(plant.getId());
        assertThat(found.orElseThrow().getStatus()).isEqualTo(ResourceStatus.ACTIVE);
    }

    @Test
    void returnsOnlyActiveZonesInListQuery() {
        zonePersistenceAdapter.save(new Zone(
                null,
                plant.getId(),
                "Zone-A",
                "North",
                "desc",
                ResourceStatus.ACTIVE,
                ownerUser.getId(),
                now(),
                now()
        ));
        zonePersistenceAdapter.save(new Zone(
                null,
                plant.getId(),
                "Zone-B",
                "South",
                "desc",
                ResourceStatus.INACTIVE,
                ownerUser.getId(),
                now(),
                now()
        ));

        List<?> results = zonePersistenceAdapter.findAll(new ZoneListQuery(ownerUser.getId(), plant.getId()));

        assertThat(results).hasSize(1);
        assertThat(results.toString()).contains("Zone-A");
        assertThat(results.toString()).doesNotContain("Zone-B");
    }

    @Test
    void returnsAllZonesByPlantIdIncludingInactive() {
        zonePersistenceAdapter.save(new Zone(
                null,
                plant.getId(),
                "Zone-A",
                "North",
                "desc",
                ResourceStatus.ACTIVE,
                ownerUser.getId(),
                now(),
                now()
        ));
        zonePersistenceAdapter.save(new Zone(
                null,
                plant.getId(),
                "Zone-B",
                "South",
                "desc",
                ResourceStatus.INACTIVE,
                ownerUser.getId(),
                now(),
                now()
        ));

        List<Zone> zones = zonePersistenceAdapter.findByPlantId(plant.getId());

        assertThat(zones).hasSize(2);
        assertThat(zones).extracting(Zone::getName).contains("Zone-A", "Zone-B");
    }

    @Test
    void preservesCreatedAtAndUpdatedAt() {
        OffsetDateTime createdAt = OffsetDateTime.parse("2026-06-05T09:00:00+09:00");
        OffsetDateTime updatedAt = OffsetDateTime.parse("2026-06-05T10:00:00+09:00");

        Zone saved = zonePersistenceAdapter.save(new Zone(
                null,
                plant.getId(),
                "Zone-A",
                "North",
                "desc",
                ResourceStatus.ACTIVE,
                ownerUser.getId(),
                createdAt,
                updatedAt
        ));

        Zone found = zonePersistenceAdapter.findById(saved.getId()).orElseThrow();

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
        return OffsetDateTime.parse("2026-06-05T08:00:00+09:00");
    }
}
