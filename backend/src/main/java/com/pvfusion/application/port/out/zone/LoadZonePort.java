package com.pvfusion.application.port.out.zone;

import com.pvfusion.application.dto.zone.ZoneListQuery;
import com.pvfusion.domain.zone.Zone;
import java.util.List;
import java.util.Optional;

public interface LoadZonePort {

    Optional<Zone> loadZone(Long zoneId);

    List<Zone> loadZones(ZoneListQuery query);
}
