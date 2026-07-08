package com.pvfusion.adapter.out.persistence.operation;

import static org.assertj.core.api.Assertions.assertThat;

import com.pvfusion.adapter.out.persistence.plant.PlantPersistenceAdapter;
import com.pvfusion.adapter.out.persistence.plant.PlantPersistenceMapper;
import com.pvfusion.adapter.out.persistence.user.UserPersistenceAdapter;
import com.pvfusion.adapter.out.persistence.user.UserPersistenceMapper;
import com.pvfusion.adapter.out.persistence.zone.ZonePersistenceAdapter;
import com.pvfusion.adapter.out.persistence.zone.ZonePersistenceMapper;
import com.pvfusion.application.dto.operation.OperationLogQuery;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.operation.OperationEventCategory;
import com.pvfusion.domain.operation.OperationEventType;
import com.pvfusion.domain.operation.OperationLog;
import com.pvfusion.domain.plant.Plant;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.user.UserRole;
import com.pvfusion.domain.zone.Zone;
import com.pvfusion.support.PostgresDataJpaTest;
import com.pvfusion.support.PostgresTestContainerSupport;
import com.pvfusion.global.response.PageResponse;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;

@PostgresDataJpaTest
@Import({
        UserPersistenceAdapter.class,
        UserPersistenceMapper.class,
        PlantPersistenceAdapter.class,
        PlantPersistenceMapper.class,
        ZonePersistenceAdapter.class,
        ZonePersistenceMapper.class,
        OperationLogPersistenceAdapter.class,
        OperationLogPersistenceMapper.class
})
class OperationLogPersistenceAdapterTest extends PostgresTestContainerSupport {

    @Autowired
    private UserPersistenceAdapter userPersistenceAdapter;
    @Autowired
    private PlantPersistenceAdapter plantPersistenceAdapter;
    @Autowired
    private ZonePersistenceAdapter zonePersistenceAdapter;
    @Autowired
    private OperationLogPersistenceAdapter operationLogPersistenceAdapter;

    private User adminUser;
    private User normalUser;
    private Plant plant;
    private Zone zone;

    @BeforeEach
    void setUp() {
        adminUser = saveUser(1, UserRole.ADMIN);
        normalUser = saveUser(2, UserRole.USER);
        plant = plantPersistenceAdapter.save(new Plant(
                null,
                "Operation Plant",
                "Seoul",
                "desc",
                ResourceStatus.ACTIVE,
                adminUser.getId(),
                now().minusDays(1),
                now().minusDays(1)
        ));
        zone = zonePersistenceAdapter.save(new Zone(
                null,
                plant.getId(),
                "Operation Zone",
                "North",
                "desc",
                ResourceStatus.ACTIVE,
                adminUser.getId(),
                now().minusHours(12),
                now().minusHours(12)
        ));
    }

    @Test
    void savesOperationLog() {
        OperationLog saved = operationLogPersistenceAdapter.save(operationLog(
                null,
                adminUser.getId(),
                OperationEventType.PLANT_CREATED,
                "plants",
                plant.getId(),
                plant.getId(),
                null,
                "Plant created.",
                "name=Plant-A",
                now().minusHours(1)
        ));

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isEqualTo(now().minusHours(1));
        assertThat(saved.getUpdatedAt()).isEqualTo(now().minusHours(1));
    }

    @Test
    void findsOperationLogsWithFiltersAndDerivedActorFields() {
        operationLogPersistenceAdapter.save(operationLog(
                null,
                adminUser.getId(),
                OperationEventType.PLANT_CREATED,
                "plants",
                plant.getId(),
                plant.getId(),
                null,
                "Plant created.",
                "name=Plant-A",
                now().minusHours(2)
        ));
        operationLogPersistenceAdapter.save(operationLog(
                null,
                normalUser.getId(),
                OperationEventType.ZONE_CREATED,
                "zones",
                zone.getId(),
                plant.getId(),
                zone.getId(),
                "Zone created.",
                "name=Zone-A",
                now().minusHours(1)
        ));

        PageResponse<?> result = operationLogPersistenceAdapter.findAll(new OperationLogQuery(
                null,
                adminUser.getId(),
                OperationEventCategory.ADMIN,
                OperationEventType.ZONE_CREATED,
                plant.getId(),
                zone.getId(),
                null,
                null,
                null,
                null,
                null,
                now().minusDays(1),
                now(),
                "zone",
                0,
                10,
                "createdAt,desc"
        ));

        assertThat(result.content()).hasSize(1);
        assertThat(result.totalElements()).isEqualTo(1);
        assertThat(result.content().toString()).contains("user2@example.com");
        assertThat(result.content().toString()).contains("USER");
    }

    @Test
    void appliesPagination() {
        operationLogPersistenceAdapter.save(operationLog(
                null,
                adminUser.getId(),
                OperationEventType.PLANT_CREATED,
                "plants",
                plant.getId(),
                plant.getId(),
                null,
                "First",
                "detail-1",
                now().minusHours(3)
        ));
        operationLogPersistenceAdapter.save(operationLog(
                null,
                adminUser.getId(),
                OperationEventType.PLANT_UPDATED,
                "plants",
                plant.getId(),
                plant.getId(),
                null,
                "Second",
                "detail-2",
                now().minusHours(2)
        ));
        operationLogPersistenceAdapter.save(operationLog(
                null,
                adminUser.getId(),
                OperationEventType.PLANT_DEACTIVATED,
                "plants",
                plant.getId(),
                plant.getId(),
                null,
                "Third",
                "detail-3",
                now().minusHours(1)
        ));

        PageResponse<?> result = operationLogPersistenceAdapter.findAll(new OperationLogQuery(
                null,
                adminUser.getId(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                0,
                2,
                "createdAt,desc"
        ));

        assertThat(result.content()).hasSize(2);
        assertThat(result.totalElements()).isEqualTo(3);
        assertThat(result.hasNext()).isTrue();
    }

    @Test
    void findsOperationLogsWithCaseInsensitiveKeyword() {
        operationLogPersistenceAdapter.save(operationLog(
                null,
                adminUser.getId(),
                OperationEventType.PLANT_UPDATED,
                "plants",
                plant.getId(),
                plant.getId(),
                null,
                "Plant updated.",
                "target=Solar Farm",
                now().minusMinutes(20)
        ));
        PageResponse<?> result = operationLogPersistenceAdapter.findAll(new OperationLogQuery(
                null,
                adminUser.getId(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "  SOLAR ",
                0,
                10,
                "createdAt,desc"
        ));

        assertThat(result.content()).hasSize(1);
        assertThat(result.totalElements()).isEqualTo(1);
        assertThat(result.content().toString()).contains("Plant updated.");
        assertThat(result.content().toString()).contains("PLANT_UPDATED");
        assertThat(result.content().toString()).contains("plants");
        assertThat(result.content().toString()).contains(String.valueOf(plant.getId()));
    }

    @Test
    void findsOperationLogsWhenKeywordIsBlank() {
        operationLogPersistenceAdapter.save(operationLog(
                null,
                adminUser.getId(),
                OperationEventType.PLANT_UPDATED,
                "plants",
                plant.getId(),
                plant.getId(),
                null,
                "Blank keyword baseline.",
                "target=Blank",
                now().minusMinutes(10)
        ));

        PageResponse<?> nullKeywordPage = operationLogPersistenceAdapter.findAll(new OperationLogQuery(
                null,
                adminUser.getId(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                0,
                10,
                "createdAt,desc"
        ));
        PageResponse<?> blankKeywordPage = operationLogPersistenceAdapter.findAll(new OperationLogQuery(
                null,
                adminUser.getId(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "   ",
                0,
                10,
                "createdAt,desc"
        ));

        assertThat(blankKeywordPage.totalElements()).isEqualTo(nullKeywordPage.totalElements());
    }

    @Test
    void findsOperationLogsWhenKeywordIsNull() {
        operationLogPersistenceAdapter.save(operationLog(
                null,
                adminUser.getId(),
                OperationEventType.PLANT_UPDATED,
                "plants",
                plant.getId(),
                plant.getId(),
                null,
                "Null keyword baseline.",
                "target=Null",
                now().minusMinutes(8)
        ));

        PageResponse<?> result = operationLogPersistenceAdapter.findAll(new OperationLogQuery(
                null,
                adminUser.getId(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                0,
                10,
                "createdAt,DESC"
        ));

        assertThat(result.totalElements()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void findsOperationLogsEvenWhenActorUserIsNull() {
        operationLogPersistenceAdapter.save(operationLog(
                null,
                null,
                OperationEventType.SYSTEM_ERROR,
                "system",
                null,
                null,
                null,
                "Unhandled error.",
                "traceId=test-trace",
                now().minusMinutes(5)
        ));

        PageResponse<?> result = operationLogPersistenceAdapter.findAll(new OperationLogQuery(
                null,
                adminUser.getId(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                0,
                10,
                "createdAt,desc"
        ));

        assertThat(result.content()).hasSize(1);
        assertThat(result.content().toString()).contains("SYSTEM_ERROR");
        assertThat(result.content().toString()).contains("Unhandled error.");
    }

    

    private OperationLog operationLog(
            Long id,
            Long actorUserId,
            OperationEventType eventType,
            String targetTable,
            Long targetId,
            Long plantId,
            Long zoneId,
            String message,
            String detail,
            OffsetDateTime createdAt
    ) {
        return new OperationLog(
                id,
                actorUserId,
                OperationEventCategory.ADMIN,
                eventType,
                targetTable,
                targetId,
                plantId,
                zoneId,
                null,
                null,
                null,
                null,
                null,
                "127.0.0.1",
                "JUnit",
                message,
                detail,
                createdAt,
                createdAt
        );
    }

    private User saveUser(int index, UserRole role) {
        OffsetDateTime now = now().plusMinutes(index);
        return userPersistenceAdapter.save(new User(
                null,
                "user" + index + "@example.com",
                "User " + index,
                "GOOGLE",
                "google-" + index,
                role,
                AccountStatus.APPROVED,
                now,
                now,
                now
        ));
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-06T09:00:00+09:00");
    }
}
