package com.pvfusion.application.port.out.operation;

import com.pvfusion.application.dto.operation.OperationLogQuery;
import com.pvfusion.application.dto.operation.OperationLogSummaryResponse;
import com.pvfusion.domain.operation.OperationLog;
import com.pvfusion.global.response.PageResponse;

public interface OperationLogRepositoryPort {

    PageResponse<OperationLogSummaryResponse> findAll(OperationLogQuery query);

    OperationLog save(OperationLog operationLog);
}
