package com.pvfusion.adapter.out.persistence.defect;

import com.pvfusion.domain.defect.DefectType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.Locale;

@Converter(autoApply = false)
public class DefectTypeJpaConverter implements AttributeConverter<DefectType, String> {

    @Override
    public String convertToDatabaseColumn(DefectType attribute) {
        return attribute != null ? attribute.name() : null;
    }

    @Override
    public DefectType convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }

        return switch (dbData.trim()) {
            case "HotSpot" -> DefectType.HOTSPOT;
            case "Diode_ByPassed", "String_Fault" -> DefectType.UNKNOWN;
            default -> DefectType.valueOf(dbData.trim().toUpperCase(Locale.ROOT));
        };
    }
}
