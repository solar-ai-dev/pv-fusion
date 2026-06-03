package com.pvfusion.application.port.in.inspection;

import com.pvfusion.application.dto.inspection.InspectionResponse;
import com.pvfusion.application.dto.inspection.UpdateInspectionCommand;

public interface UpdateInspectionUseCase {

    InspectionResponse execute(UpdateInspectionCommand command);
}
