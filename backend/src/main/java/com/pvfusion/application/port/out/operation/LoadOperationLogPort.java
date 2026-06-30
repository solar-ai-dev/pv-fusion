package com.pvfusion.application.port.out.operation;

import com.pvfusion.application.dto.operation.OperationLogQuery;
import com.pvfusion.application.dto.operation.OperationLogSummaryResponse;
import java.util.List;

public interface LoadOperationLogPort {

    List<OperationLogSummaryResponse> loadOperationLogs(OperationLogQuery query);

    long countOperationLogs(OperationLogQuery query);
}
