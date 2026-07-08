package com.pvfusion.adapter.out.persistence.plant;

import static org.assertj.core.api.Assertions.assertThat;

import com.pvfusion.adapter.out.persistence.user.UserPersistenceAdapter;
import com.pvfusion.adapter.out.persistence.user.UserPersistenceMapper;
import com.pvfusion.application.dto.user.PlantMemberListQuery;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.plant.Plant;
import com.pvfusion.domain.plant.PlantMember;
import com.pvfusion.domain.plant.PlantMemberRole;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.user.UserRole;
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
        PlantMemberPersistenceAdapter.class,
        PlantMemberPersistenceMapper.class
})
class PlantMemberPersistenceAdapterTest {

    @Autowired
    private UserPersistenceAdapter userPersistenceAdapter;
    @Autowired
    private PlantPersistenceAdapter plantPersistenceAdapter;
    @Autowired
    private PlantMemberPersistenceAdapter plantMemberPersistenceAdapter;

    private Plant plant;
    private User user;

    @BeforeEach
    void setUp() {
        User creator = saveUser(1, "creator@example.com");
        user = saveUser(2, "member@example.com");
        OffsetDateTime now = OffsetDateTime.parse("2026-06-05T09:00:00+09:00");
        plant = plantPersistenceAdapter.save(new Plant(
                null,
                "테스트 발전소",
                "서울",
                "설명",
                ResourceStatus.ACTIVE,
                creator.getId(),
                now,
                now
        ));
    }

    @Test
    void savesPlantMemberAndFindsItByPlantIdAndUserId() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-05T10:00:00+09:00");
        PlantMember saved = plantMemberPersistenceAdapter.save(new PlantMember(
                null,
                plant.getId(),
                user.getId(),
                PlantMemberRole.VIEWER,
                ResourceStatus.ACTIVE,
                now,
                now
        ));

        Optional<PlantMember> found = plantMemberPersistenceAdapter.findByPlantIdAndUserId(plant.getId(), user.getId());

        assertThat(saved.getId()).isNotNull();
        assertThat(found).isPresent();
        assertThat(found.orElseThrow().getMemberRole()).isEqualTo(PlantMemberRole.VIEWER);
    }

    @Test
    void checksActiveMembershipAndQueriesByPlant() {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-05T10:30:00+09:00");
        plantMemberPersistenceAdapter.save(new PlantMember(
                null,
                plant.getId(),
                user.getId(),
                PlantMemberRole.MANAGER,
                ResourceStatus.ACTIVE,
                now,
                now
        ));

        boolean exists = plantMemberPersistenceAdapter.existsActiveByPlantIdAndUserId(plant.getId(), user.getId());
        List<?> members = plantMemberPersistenceAdapter.findAll(new PlantMemberListQuery(
                null,
                plant.getId(),
                null,
                null,
                ResourceStatus.ACTIVE
        ));

        assertThat(exists).isTrue();
        assertThat(members).hasSize(1);
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
