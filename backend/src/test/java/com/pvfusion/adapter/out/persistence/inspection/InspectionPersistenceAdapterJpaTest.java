package com.pvfusion.adapter.out.persistence.inspection;

import static org.assertj.core.api.Assertions.assertThat;

import com.pvfusion.adapter.out.persistence.plant.PlantPersistenceAdapter;
import com.pvfusion.adapter.out.persistence.plant.PlantPersistenceMapper;
import com.pvfusion.adapter.out.persistence.user.UserPersistenceAdapter;
import com.pvfusion.adapter.out.persistence.user.UserPersistenceMapper;
import com.pvfusion.adapter.out.persistence.zone.ZonePersistenceAdapter;
import com.pvfusion.adapter.out.persistence.zone.ZonePersistenceMapper;
import com.pvfusion.application.dto.inspection.InspectionListQuery;
import com.pvfusion.global.config.JpaAuditingConfig;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.inspection.CaptureMethod;
import com.pvfusion.domain.inspection.Inspection;
import com.pvfusion.domain.inspection.InspectionStatus;
import com.pvfusion.domain.plant.Plant;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.user.UserRole;
import com.pvfusion.domain.zone.Zone;
import com.pvfusion.support.PostgresDataJpaTest;
import com.pvfusion.support.PostgresTestContainerSupport;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;

@PostgresDataJpaTest
@Import({
        JpaAuditingConfig.class,
        UserPersistenceAdapter.class,
        UserPersistenceMapper.class,
        PlantPersistenceAdapter.class,
        PlantPersistenceMapper.class,
        ZonePersistenceAdapter.class,
        ZonePersistenceMapper.class,
        InspectionPersistenceAdapter.class
})
class InspectionPersistenceAdapterJpaTest extends PostgresTestContainerSupport {

    @Autowired
    private UserPersistenceAdapter userPersistenceAdapter;
    @Autowired
    private PlantPersistenceAdapter plantPersistenceAdapter;
    @Autowired
    private ZonePersistenceAdapter zonePersistenceAdapter;
    @Autowired
    private InspectionPersistenceAdapter inspectionPersistenceAdapter;

    private User ownerUser;
    private Zone zone;

    @BeforeEach
    void setUp() {
        ownerUser = saveUser();
        Plant plant = plantPersistenceAdapter.save(new Plant(
                null,
                "Plant A",
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
                "Zone A",
                "North",
                "desc",
                ResourceStatus.ACTIVE,
                ownerUser.getId(),
                now().minusDays(2),
                now().minusDays(1)
        ));
    }

    @Test
    void loadInspectionsSupportsAdminStyleQueryWithoutOptionalFilters() {
        inspectionPersistenceAdapter.saveInspection(new Inspection(
                null,
                zone.getId(),
                "Inspection A",
                now(),
                CaptureMethod.DRONE,
                "Kim",
                "memo",
                InspectionStatus.READY,
                ownerUser.getId(),
                now(),
                now()
        ));

        InspectionListQuery query = new InspectionListQuery(null, null, null, null, null, 0, 20);

        List<Inspection> inspections = inspectionPersistenceAdapter.loadInspections(query);
        long totalElements = inspectionPersistenceAdapter.countInspections(query);

        assertThat(inspections).hasSize(1);
        assertThat(totalElements).isEqualTo(1);
        assertThat(inspections.get(0).getName()).isEqualTo("Inspection A");
    }

    @Test
    @DisplayName("inspection 목록 조회는 created_at 내림차순 정렬을 사용한다")
    void loadInspectionsOrdersByCreatedAtDescending() throws InterruptedException {
        inspectionPersistenceAdapter.saveInspection(new Inspection(
                null,
                zone.getId(),
                "Inspection Older",
                now().minusDays(1),
                CaptureMethod.DRONE,
                "Kim",
                "memo",
                InspectionStatus.READY,
                ownerUser.getId(),
                now().minusDays(1),
                now().minusDays(1)
        ));

        Thread.sleep(10);

        inspectionPersistenceAdapter.saveInspection(new Inspection(
                null,
                zone.getId(),
                "Inspection Newer",
                now(),
                CaptureMethod.DRONE,
                "Kim",
                "memo",
                InspectionStatus.READY,
                ownerUser.getId(),
                now(),
                now()
        ));

        List<Inspection> inspections = inspectionPersistenceAdapter.loadInspections(
                new InspectionListQuery(null, null, null, null, null, 0, 20)
        );

        assertThat(inspections).extracting(Inspection::getName)
                .containsExactly("Inspection Newer", "Inspection Older");
    }

    @Test
    void saveInspectionPersistsAuditTimestampsWhenDomainTimestampsAreNull() {
        Inspection saved = inspectionPersistenceAdapter.saveInspection(new Inspection(
                null,
                zone.getId(),
                "Inspection B",
                now(),
                CaptureMethod.DRONE,
                "Kim",
                "memo",
                InspectionStatus.READY,
                ownerUser.getId(),
                null,
                null
        ));

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
    }

    private User saveUser() {
        return userPersistenceAdapter.save(new User(
                null,
                "owner@example.com",
                "Owner",
                "GOOGLE",
                "google-owner",
                UserRole.ADMIN,
                AccountStatus.APPROVED,
                now(),
                now().minusDays(3),
                now().minusDays(1)
        ));
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-08T09:00:00+09:00");
    }
}
