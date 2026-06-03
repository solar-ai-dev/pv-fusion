package com.pvfusion.application.port.in.operation;

import com.pvfusion.application.dto.operation.OperationLogQuery;
import com.pvfusion.application.dto.operation.OperationLogSummaryResponse;
import com.pvfusion.global.response.PageResponse;

public interface QueryOperationLogUseCase {

    PageResponse<OperationLogSummaryResponse> execute(OperationLogQuery query);
}
