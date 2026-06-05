package com.pvfusion.service.result;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.defect.SaveDetectedDefectCommand;
import com.pvfusion.application.dto.image.ImageAccessUrlResult;
import com.pvfusion.application.dto.result.AnalysisResultListQuery;
import com.pvfusion.application.dto.result.GetResultVisualizationQuery;
import com.pvfusion.application.dto.result.SaveAnalysisResultCommand;
import com.pvfusion.application.dto.result.UpdateResultActionCandidateCommand;
import com.pvfusion.application.dto.review.ChangeResultReviewStatusCommand;
import com.pvfusion.application.port.in.access.AccessChecker;
import com.pvfusion.application.port.out.analysis.LoadAnalysisJobPort;
import com.pvfusion.application.port.out.defect.LoadDetectedDefectPort;
import com.pvfusion.application.port.out.defect.SaveDetectedDefectPort;
import com.pvfusion.application.port.out.image.GenerateImageAccessUrlPort;
import com.pvfusion.application.port.out.image.LoadImagePort;
import com.pvfusion.application.port.out.imagepair.LoadImagePairPort;
import com.pvfusion.application.port.out.inspection.LoadInspectionPort;
import com.pvfusion.application.port.out.result.LoadAnalysisResultPort;
import com.pvfusion.application.port.out.result.SaveAnalysisResultPort;
import com.pvfusion.application.port.out.result.UpdateAnalysisResultPort;
import com.pvfusion.application.port.out.review.LoadResultReviewHistoryPort;
import com.pvfusion.application.port.out.review.SaveResultReviewHistoryPort;
import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisJob;
import com.pvfusion.domain.analysis.AnalysisJobStatus;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.analysis.RequestedModelType;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.image.ImageType;
import com.pvfusion.domain.image.InspectionImage;
import com.pvfusion.domain.image.UploadStatus;
import com.pvfusion.domain.inspection.Inspection;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.AnalysisResult;
import com.pvfusion.domain.result.AnalysisResultStatus;
import com.pvfusion.domain.result.PriorityLevel;
import com.pvfusion.domain.result.SeverityLevel;
import com.pvfusion.domain.review.ReviewStatus;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AnalysisResultServiceTest {

    @Mock
    private LoadAnalysisResultPort loadAnalysisResultPort;
    @Mock
    private SaveAnalysisResultPort saveAnalysisResultPort;
    @Mock
    private UpdateAnalysisResultPort updateAnalysisResultPort;
    @Mock
    private LoadDetectedDefectPort loadDetectedDefectPort;
    @Mock
    private SaveDetectedDefectPort saveDetectedDefectPort;
    @Mock
    private LoadResultReviewHistoryPort loadResultReviewHistoryPort;
    @Mock
    private SaveResultReviewHistoryPort saveResultReviewHistoryPort;
    @Mock
    private LoadAnalysisJobPort loadAnalysisJobPort;
    @Mock
    private LoadImagePort loadImagePort;
    @Mock
    private LoadImagePairPort loadImagePairPort;
    @Mock
    private LoadInspectionPort loadInspectionPort;
    @Mock
    private GenerateImageAccessUrlPort generateImageAccessUrlPort;
    @Mock
    private AccessChecker accessChecker;

    private AnalysisResultService analysisResultService;

    @BeforeEach
    void setUp() {
        analysisResultService = new AnalysisResultService(
                loadAnalysisResultPort,
                saveAnalysisResultPort,
                updateAnalysisResultPort,
                loadDetectedDefectPort,
                saveDetectedDefectPort,
                loadResultReviewHistoryPort,
                saveResultReviewHistoryPort,
                loadAnalysisJobPort,
                loadImagePort,
                loadImagePairPort,
                loadInspectionPort,
                generateImageAccessUrlPort,
                accessChecker,
                Optional.empty()
        );
    }

    @Test
    void saveAnalysisResultSavesDefectsAndReturnsResponse() {
        AnalysisJob job = analysisJob();
        AnalysisResult saved = analysisResult(1L, ReviewStatus.UNCHECKED, ActionCandidate.CLEANING);
        InspectionImage image = image();

        when(loadAnalysisJobPort.loadAnalysisJob(10L)).thenReturn(Optional.of(job));
        when(accessChecker.checkAnalysisJobAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisResultPort.loadAnalysisResultByAnalysisJobId(10L)).thenReturn(Optional.empty());
        when(saveAnalysisResultPort.saveAnalysisResult(any())).thenReturn(saved);
        when(saveDetectedDefectPort.saveDetectedDefect(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(loadDetectedDefectPort.loadDetectedDefects(any())).thenReturn(List.of());
        when(loadResultReviewHistoryPort.loadResultReviewHistories(any())).thenReturn(List.of());
        when(loadImagePort.loadImage(20L)).thenReturn(Optional.of(image));
        when(loadInspectionPort.loadInspection(30L)).thenReturn(Optional.of(inspection()));

        var response = analysisResultService.execute(new SaveAnalysisResultCommand(
                1L, 10L, "model-a", "1.0", "onnx", "cpu", 640, BigDecimal.valueOf(0.75),
                AnalysisResultStatus.ANOMALY, 2, BigDecimal.valueOf(0.92), BigDecimal.valueOf(0.11),
                BigDecimal.valueOf(0.88), SeverityLevel.HIGH, ActionCandidate.CLEANING, PriorityLevel.HIGH,
                "bucket", "bbox-key", null, null, null, null, null, null, null, OffsetDateTime.now(),
                List.of(new SaveDetectedDefectCommand(
                        null, com.pvfusion.domain.defect.DefectType.HOTSPOT, com.pvfusion.domain.defect.DefectSource.FUSION,
                        BigDecimal.valueOf(0.95), BigDecimal.valueOf(0.03), 1, 2, 3, 4,
                        null, null, null, BigDecimal.valueOf(0.7), SeverityLevel.HIGH, ActionCandidate.CLEANING
                ))
        ));

        verify(saveDetectedDefectPort).saveDetectedDefect(any());
        assertThat(response.resultId()).isEqualTo(1L);
        assertThat(response.reviewStatus()).isEqualTo(ReviewStatus.UNCHECKED);
    }

    @Test
    void saveAnalysisResultFailsWhenDuplicateExists() {
        when(loadAnalysisJobPort.loadAnalysisJob(10L)).thenReturn(Optional.of(analysisJob()));
        when(accessChecker.checkAnalysisJobAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisResultPort.loadAnalysisResultByAnalysisJobId(10L)).thenReturn(Optional.of(analysisResult(1L, ReviewStatus.UNCHECKED, ActionCandidate.CLEANING)));

        assertThatThrownBy(() -> analysisResultService.execute(new SaveAnalysisResultCommand(
                1L, 10L, "model-a", "1.0", "onnx", "cpu", 640, BigDecimal.valueOf(0.75),
                AnalysisResultStatus.ANOMALY, 1, null, null, BigDecimal.valueOf(0.8), SeverityLevel.HIGH,
                ActionCandidate.CLEANING, PriorityLevel.HIGH, null, null, null, null, null, null, null, null, null,
                OffsetDateTime.now(), List.of()
        ))).isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.DUPLICATE_RESOURCE);
    }

    @Test
    void queryAnalysisResultsRequiresScopedFilterForNonAdmin() {
        when(accessChecker.isAdmin(1L)).thenReturn(false);

        assertThatThrownBy(() -> analysisResultService.execute(new AnalysisResultListQuery(
                1L, null, null, null, null, null, null, null, null, null, null, null, null, 0, 20
        ))).isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void changeReviewStatusUpdatesResultAndHistory() {
        AnalysisResult existing = analysisResult(1L, ReviewStatus.UNCHECKED, ActionCandidate.CLEANING);
        AnalysisResult updated = analysisResult(1L, ReviewStatus.CONFIRMED, ActionCandidate.FIELD_INSPECTION);
        when(loadAnalysisResultPort.loadAnalysisResult(1L)).thenReturn(Optional.of(existing));
        when(accessChecker.checkResultAccess(1L, 1L)).thenReturn(true);
        when(updateAnalysisResultPort.updateAnalysisResult(any())).thenReturn(updated);
        when(loadDetectedDefectPort.loadDetectedDefects(any())).thenReturn(List.of());
        when(loadResultReviewHistoryPort.loadResultReviewHistories(any())).thenReturn(List.of());
        when(loadAnalysisJobPort.loadAnalysisJob(10L)).thenReturn(Optional.of(analysisJob()));
        when(loadImagePort.loadImage(20L)).thenReturn(Optional.of(image()));
        when(loadInspectionPort.loadInspection(30L)).thenReturn(Optional.of(inspection()));

        var response = analysisResultService.execute(new ChangeResultReviewStatusCommand(
                1L, 1L, ReviewStatus.CONFIRMED, ActionCandidate.FIELD_INSPECTION, "checked"
        ));

        verify(saveResultReviewHistoryPort).saveResultReviewHistory(any());
        assertThat(response.reviewStatus()).isEqualTo(ReviewStatus.CONFIRMED);
        assertThat(response.actionCandidate()).isEqualTo(ActionCandidate.FIELD_INSPECTION);
    }

    @Test
    void getVisualizationGeneratesAccessUrl() {
        AnalysisResult result = analysisResult(1L, ReviewStatus.UNCHECKED, ActionCandidate.CLEANING);
        when(loadAnalysisResultPort.loadAnalysisResult(1L)).thenReturn(Optional.of(result));
        when(accessChecker.checkResultAccess(1L, 1L)).thenReturn(true);
        when(generateImageAccessUrlPort.generate(any())).thenReturn(
                new ImageAccessUrlResult("https://example.com/bbox", OffsetDateTime.now().plusMinutes(5))
        );

        var response = analysisResultService.execute(new GetResultVisualizationQuery(1L, 1L, "bbox", null));

        assertThat(response.type()).isEqualTo("bbox");
        assertThat(response.url()).isEqualTo("https://example.com/bbox");
    }

    @Test
    void updateActionCandidateSavesHistory() {
        AnalysisResult existing = analysisResult(1L, ReviewStatus.UNCHECKED, ActionCandidate.CLEANING);
        AnalysisResult updated = analysisResult(1L, ReviewStatus.UNCHECKED, ActionCandidate.RETAKE);
        when(loadAnalysisResultPort.loadAnalysisResult(1L)).thenReturn(Optional.of(existing));
        when(accessChecker.checkResultAccess(1L, 1L)).thenReturn(true);
        when(updateAnalysisResultPort.updateAnalysisResult(any())).thenReturn(updated);
        when(loadDetectedDefectPort.loadDetectedDefects(any())).thenReturn(List.of());
        when(loadResultReviewHistoryPort.loadResultReviewHistories(any())).thenReturn(List.of());
        when(loadAnalysisJobPort.loadAnalysisJob(10L)).thenReturn(Optional.of(analysisJob()));
        when(loadImagePort.loadImage(20L)).thenReturn(Optional.of(image()));
        when(loadInspectionPort.loadInspection(30L)).thenReturn(Optional.of(inspection()));

        var response = analysisResultService.execute(new UpdateResultActionCandidateCommand(1L, 1L, ActionCandidate.RETAKE, "memo"));

        verify(saveResultReviewHistoryPort).saveResultReviewHistory(any());
        assertThat(response.actionCandidate()).isEqualTo(ActionCandidate.RETAKE);
    }

    private AnalysisJob analysisJob() {
        return new AnalysisJob(
                10L, 20L, null, AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.SUCCEEDED, 1L, OffsetDateTime.now(), null, null, 0, "trace", null, null,
                OffsetDateTime.now(), OffsetDateTime.now()
        );
    }

    private AnalysisResult analysisResult(Long id, ReviewStatus reviewStatus, ActionCandidate actionCandidate) {
        return new AnalysisResult(
                id, 10L, AnalysisModelType.RGB_ONLY, "model-a", "1.0", "onnx", "cpu", 640, BigDecimal.valueOf(0.75),
                AnalysisResultStatus.ANOMALY, 2, BigDecimal.valueOf(0.95), BigDecimal.valueOf(0.11), BigDecimal.valueOf(0.88),
                SeverityLevel.HIGH, actionCandidate, PriorityLevel.HIGH, reviewStatus,
                "bucket", "bbox-key", null, null, null, null, null, null, null,
                OffsetDateTime.now(), OffsetDateTime.now(), OffsetDateTime.now()
        );
    }

    private InspectionImage image() {
        return new InspectionImage(
                20L, 30L, null, TargetType.ZONE, ImageType.RGB, "image.jpg", "image/jpeg", 10L,
                "bucket", "image-key", null, OffsetDateTime.now(), UploadStatus.UPLOADED,
                com.pvfusion.domain.common.ResourceStatus.ACTIVE, 1L, OffsetDateTime.now(), OffsetDateTime.now()
        );
    }

    private Inspection inspection() {
        return new Inspection(30L, 40L, "inspection", null, com.pvfusion.domain.inspection.CaptureMethod.DRONE, null, null, null, 1L, null, null);
    }
}
