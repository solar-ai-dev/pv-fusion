package com.pvfusion.application.port.in.operation;

import com.pvfusion.application.dto.operation.OperationLogResponse;
import com.pvfusion.application.dto.operation.RecordOperationLogCommand;

public interface RecordOperationLogUseCase {

    OperationLogResponse execute(RecordOperationLogCommand command);
}
