package com.pvfusion.application.port.out.operation;

import com.pvfusion.domain.operation.OperationLog;

public interface SaveOperationLogPort {

    OperationLog saveOperationLog(OperationLog operationLog);
}
