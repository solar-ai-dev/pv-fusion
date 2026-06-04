package com.pvfusion.application.port.out.zone;

import com.pvfusion.application.dto.zone.ZoneListQuery;
import com.pvfusion.application.dto.zone.ZoneSummaryResponse;
import com.pvfusion.domain.zone.Zone;
import java.util.List;
import java.util.Optional;

public interface ZoneRepositoryPort {

    List<ZoneSummaryResponse> findAll(ZoneListQuery query);

    Optional<Zone> findById(Long zoneId);

    List<Zone> findByPlantId(Long plantId);

    Zone save(Zone zone);
}
