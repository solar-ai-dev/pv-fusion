package com.pvfusion.adapter.out.persistence.plant;

import static org.assertj.core.api.Assertions.assertThat;

import com.pvfusion.adapter.out.persistence.user.UserPersistenceAdapter;
import com.pvfusion.adapter.out.persistence.user.UserPersistenceMapper;
import com.pvfusion.application.dto.plant.PlantListQuery;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.plant.Plant;
import com.pvfusion.domain.plant.PlantMember;
import com.pvfusion.domain.plant.PlantMemberRole;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.user.UserRole;
import com.pvfusion.global.response.PageResponse;
import jakarta.persistence.EntityManager;
import java.time.OffsetDateTime;
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
        PlantMemberPersistenceAdapter.class,
        PlantMemberPersistenceMapper.class
})
class PlantPersistenceAdapterTest {

    @Autowired
    private UserPersistenceAdapter userPersistenceAdapter;
    @Autowired
    private PlantPersistenceAdapter plantPersistenceAdapter;
    @Autowired
    private PlantMemberPersistenceAdapter plantMemberPersistenceAdapter;
    @Autowired
    private EntityManager entityManager;

    private User ownerUser;
    private User memberUser;

    @BeforeEach
    void setUp() {
        createSupportTablesIfNeeded();
        ownerUser = saveUser(1, "owner@example.com");
        memberUser = saveUser(2, "member@example.com");
    }

    @Test
    void savesPlantAndFindsItById() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-05T09:00:00+09:00");
        Plant saved = plantPersistenceAdapter.save(new Plant(
                null,
                "새 발전소",
                "서울",
                "설명",
                ResourceStatus.ACTIVE,
                ownerUser.getId(),
                now,
                now
        ));

        Optional<Plant> found = plantPersistenceAdapter.findById(saved.getId());

        assertThat(saved.getId()).isNotNull();
        assertThat(found).isPresent();
        assertThat(found.orElseThrow().getCreatedByUserId()).isEqualTo(ownerUser.getId());
    }

    @Test
    void filtersAccessiblePlantsForUser() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-05T10:00:00+09:00");
        Plant accessiblePlant = plantPersistenceAdapter.save(new Plant(
                null,
                "접근 가능 발전소",
                "서울",
                "설명",
                ResourceStatus.ACTIVE,
                ownerUser.getId(),
                now,
                now
        ));
        Plant inaccessiblePlant = plantPersistenceAdapter.save(new Plant(
                null,
                "접근 불가 발전소",
                "부산",
                "설명",
                ResourceStatus.ACTIVE,
                ownerUser.getId(),
                now,
                now
        ));
        plantMemberPersistenceAdapter.save(new PlantMember(
                null,
                accessiblePlant.getId(),
                memberUser.getId(),
                PlantMemberRole.VIEWER,
                ResourceStatus.ACTIVE,
                now,
                now
        ));

        PageResponse<?> page = plantPersistenceAdapter.findAll(new PlantListQuery(
                memberUser.getId(),
                null,
                ResourceStatus.ACTIVE,
                0,
                10
        ));

        assertThat(page.totalElements()).isEqualTo(1);
        assertThat(page.content().toString()).contains("접근 가능 발전소");
        assertThat(page.content().toString()).doesNotContain("접근 불가 발전소");
        assertThat(inaccessiblePlant.getId()).isNotNull();
    }

    @Test
    void returnsZoneCountAndLatestInspectionAtInSummary() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-05T11:00:00+09:00");
        Plant plant = plantPersistenceAdapter.save(new Plant(
                null,
                "집계 발전소",
                "대전",
                "설명",
                ResourceStatus.ACTIVE,
                ownerUser.getId(),
                now,
                now
        ));
        insertZone(plant.getId(), ownerUser.getId(), "Zone A");
        insertZone(plant.getId(), ownerUser.getId(), "Zone B");
        insertInspection(1L, ownerUser.getId(), "2026-06-05T12:00:00+09:00");

        PageResponse<?> page = plantPersistenceAdapter.findAll(new PlantListQuery(null, "집계", ResourceStatus.ACTIVE, 0, 10));

        assertThat(page.content().toString()).contains("집계 발전소");
        assertThat(page.content().toString()).contains("zoneCount=2");
    }

    @Test
    void findsPlantsWhenKeywordIsNullOrBlank() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-05T13:00:00+09:00");
        plantPersistenceAdapter.save(new Plant(
                null,
                "Local Plant",
                "Seoul",
                "desc",
                ResourceStatus.ACTIVE,
                ownerUser.getId(),
                now,
                now
        ));

        PageResponse<?> nullKeywordPage = plantPersistenceAdapter.findAll(new PlantListQuery(
                null,
                null,
                ResourceStatus.ACTIVE,
                0,
                10
        ));
        PageResponse<?> blankKeywordPage = plantPersistenceAdapter.findAll(new PlantListQuery(
                null,
                "   ",
                ResourceStatus.ACTIVE,
                0,
                10
        ));

        assertThat(nullKeywordPage.totalElements()).isGreaterThanOrEqualTo(1);
        assertThat(blankKeywordPage.totalElements()).isEqualTo(nullKeywordPage.totalElements());
    }

    @Test
    void findsPlantsWithCaseInsensitiveKeyword() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-05T14:00:00+09:00");
        plantPersistenceAdapter.save(new Plant(
                null,
                "Solar Farm Alpha",
                "Busan",
                "desc",
                ResourceStatus.ACTIVE,
                ownerUser.getId(),
                now,
                now
        ));

        PageResponse<?> page = plantPersistenceAdapter.findAll(new PlantListQuery(
                null,
                "  SOLAR  ",
                ResourceStatus.ACTIVE,
                0,
                10
        ));

        assertThat(page.content().toString()).contains("Solar Farm Alpha");
    }

    private void createSupportTablesIfNeeded() {
        entityManager.createNativeQuery("""
                create table if not exists zones (
                    id bigint generated by default as identity primary key,
                    plant_id bigint not null,
                    name varchar(150) not null,
                    location varchar(255),
                    description clob,
                    status varchar(30) not null,
                    created_by_user_id bigint not null,
                    created_at timestamp with time zone not null,
                    updated_at timestamp with time zone not null
                )
                """).executeUpdate();
        entityManager.createNativeQuery("""
                create table if not exists inspections (
                    id bigint generated by default as identity primary key,
                    zone_id bigint not null,
                    name varchar(150) not null,
                    captured_at timestamp with time zone,
                    capture_method varchar(30),
                    inspector_name varchar(100),
                    memo clob,
                    inspection_status varchar(30) not null,
                    created_by_user_id bigint not null,
                    created_at timestamp with time zone not null,
                    updated_at timestamp with time zone not null
                )
                """).executeUpdate();
    }

    private void insertZone(Long plantId, Long userId, String name) {
        entityManager.createNativeQuery("""
                insert into zones (plant_id, name, location, description, status, created_by_user_id, created_at, updated_at)
                values (?1, ?2, '서울', '설명', 'ACTIVE', ?3, TIMESTAMP WITH TIME ZONE '2026-06-05 11:00:00+09:00', TIMESTAMP WITH TIME ZONE '2026-06-05 11:00:00+09:00')
                """)
                .setParameter(1, plantId)
                .setParameter(2, name)
                .setParameter(3, userId)
                .executeUpdate();
    }

    private void insertInspection(Long zoneId, Long userId, String capturedAt) {
        entityManager.createNativeQuery("""
                insert into inspections (zone_id, name, captured_at, capture_method, inspector_name, memo, inspection_status, created_by_user_id, created_at, updated_at)
                values (?1, 'Inspection', ?2, 'DRONE', 'Kim', 'memo', 'READY', ?3, TIMESTAMP WITH TIME ZONE '2026-06-05 11:00:00+09:00', TIMESTAMP WITH TIME ZONE '2026-06-05 11:00:00+09:00')
                """)
                .setParameter(1, zoneId)
                .setParameter(2, OffsetDateTime.parse(capturedAt))
                .setParameter(3, userId)
                .executeUpdate();
    }

    private User saveUser(int index, String email) {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-05T08:00:00+09:00").plusMinutes(index);
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
}
