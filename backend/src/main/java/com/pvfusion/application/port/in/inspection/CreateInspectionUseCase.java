package com.pvfusion.application.port.in.inspection;

import com.pvfusion.application.dto.inspection.CreateInspectionCommand;
import com.pvfusion.application.dto.inspection.InspectionResponse;

public interface CreateInspectionUseCase {

    InspectionResponse execute(CreateInspectionCommand command);
}
