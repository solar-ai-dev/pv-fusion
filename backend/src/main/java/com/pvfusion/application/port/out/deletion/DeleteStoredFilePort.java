package com.pvfusion.application.port.out.deletion;

import com.pvfusion.application.dto.deletion.StoredFileReference;

public interface DeleteStoredFilePort {

    void delete(StoredFileReference fileReference);
}
