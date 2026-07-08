package com.pvfusion.application.dto.deletion;

import java.util.List;

public record DeletionPlan(
        List<StoredFileReference> filesToDelete
) {
}
