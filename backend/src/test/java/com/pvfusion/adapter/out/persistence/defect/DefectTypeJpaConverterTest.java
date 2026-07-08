package com.pvfusion.adapter.out.persistence.defect;

import static org.assertj.core.api.Assertions.assertThat;

import com.pvfusion.domain.defect.DefectType;
import org.junit.jupiter.api.Test;

class DefectTypeJpaConverterTest {

    private final DefectTypeJpaConverter converter = new DefectTypeJpaConverter();

    @Test
    void convertsLegacyThermalHotSpotToBackendEnum() {
        assertThat(converter.convertToEntityAttribute("HotSpot")).isEqualTo(DefectType.HOTSPOT);
    }

    @Test
    void convertsLegacyThermalAliasesWithoutBackendEnumToUnknown() {
        assertThat(converter.convertToEntityAttribute("Diode_ByPassed")).isEqualTo(DefectType.UNKNOWN);
        assertThat(converter.convertToEntityAttribute("String_Fault")).isEqualTo(DefectType.UNKNOWN);
    }
}
