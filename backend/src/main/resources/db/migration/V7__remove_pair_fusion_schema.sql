DELETE FROM result_review_histories
WHERE analysis_result_id IN (
    SELECT ar.id
    FROM analysis_results ar
    JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
    WHERE aj.image_pair_id IS NOT NULL
       OR aj.input_type = 'RGB_THERMAL_PAIR'
       OR aj.requested_model_type IN ('AUTO', 'FUSION_AUTO', 'EARLY_FUSION', 'LATE_FUSION')
       OR aj.model_type = 'FUSION'
       OR ar.model_type = 'FUSION'
);

DELETE FROM detected_defects
WHERE defect_source = 'FUSION'
   OR analysis_result_id IN (
    SELECT ar.id
    FROM analysis_results ar
    JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
    WHERE aj.image_pair_id IS NOT NULL
       OR aj.input_type = 'RGB_THERMAL_PAIR'
       OR aj.requested_model_type IN ('AUTO', 'FUSION_AUTO', 'EARLY_FUSION', 'LATE_FUSION')
       OR aj.model_type = 'FUSION'
       OR ar.model_type = 'FUSION'
);

DELETE FROM operation_logs
WHERE image_pair_id IS NOT NULL
   OR analysis_result_id IN (
    SELECT ar.id
    FROM analysis_results ar
    JOIN analysis_jobs aj ON aj.id = ar.analysis_job_id
    WHERE aj.image_pair_id IS NOT NULL
       OR aj.input_type = 'RGB_THERMAL_PAIR'
       OR aj.requested_model_type IN ('AUTO', 'FUSION_AUTO', 'EARLY_FUSION', 'LATE_FUSION')
       OR aj.model_type = 'FUSION'
       OR ar.model_type = 'FUSION'
)
   OR analysis_job_id IN (
    SELECT aj.id
    FROM analysis_jobs aj
    WHERE aj.image_pair_id IS NOT NULL
       OR aj.input_type = 'RGB_THERMAL_PAIR'
       OR aj.requested_model_type IN ('AUTO', 'FUSION_AUTO', 'EARLY_FUSION', 'LATE_FUSION')
       OR aj.model_type = 'FUSION'
);

DELETE FROM analysis_results
WHERE analysis_job_id IN (
    SELECT aj.id
    FROM analysis_jobs aj
    WHERE aj.image_pair_id IS NOT NULL
       OR aj.input_type = 'RGB_THERMAL_PAIR'
       OR aj.requested_model_type IN ('AUTO', 'FUSION_AUTO', 'EARLY_FUSION', 'LATE_FUSION')
       OR aj.model_type = 'FUSION'
)
   OR model_type = 'FUSION';

DELETE FROM analysis_jobs
WHERE image_pair_id IS NOT NULL
   OR input_type = 'RGB_THERMAL_PAIR'
   OR requested_model_type IN ('AUTO', 'FUSION_AUTO', 'EARLY_FUSION', 'LATE_FUSION')
   OR model_type = 'FUSION';

DELETE FROM image_pairs;

ALTER TABLE operation_logs
    DROP CONSTRAINT IF EXISTS operation_logs_image_pair_id_fkey;

ALTER TABLE analysis_jobs
    DROP CONSTRAINT IF EXISTS analysis_jobs_image_pair_id_fkey;

ALTER TABLE analysis_jobs
    DROP CONSTRAINT IF EXISTS chk_analysis_jobs_single_target;

ALTER TABLE image_pairs
    DROP CONSTRAINT IF EXISTS image_pairs_pkey;

ALTER TABLE image_pairs
    DROP CONSTRAINT IF EXISTS image_pairs_inspection_id_fkey;

ALTER TABLE image_pairs
    DROP CONSTRAINT IF EXISTS image_pairs_equipment_id_fkey;

ALTER TABLE image_pairs
    DROP CONSTRAINT IF EXISTS image_pairs_rgb_image_id_fkey;

ALTER TABLE image_pairs
    DROP CONSTRAINT IF EXISTS image_pairs_thermal_image_id_fkey;

ALTER TABLE image_pairs
    DROP CONSTRAINT IF EXISTS image_pairs_created_by_user_id_fkey;

ALTER TABLE image_pairs
    DROP CONSTRAINT IF EXISTS chk_image_pairs_rgb_thermal_different;

ALTER TABLE image_pairs
    DROP CONSTRAINT IF EXISTS uq_image_pairs_rgb_image_id;

ALTER TABLE image_pairs
    DROP CONSTRAINT IF EXISTS uq_image_pairs_thermal_image_id;

ALTER TABLE analysis_jobs
    DROP COLUMN image_pair_id;

ALTER TABLE operation_logs
    DROP COLUMN image_pair_id;

ALTER TABLE analysis_jobs
    ALTER COLUMN image_id SET NOT NULL;

ALTER TABLE analysis_jobs
    ADD CONSTRAINT chk_analysis_jobs_input_type_single
        CHECK (input_type IN ('RGB_SINGLE', 'THERMAL_SINGLE'));

ALTER TABLE analysis_jobs
    ADD CONSTRAINT chk_analysis_jobs_requested_model_type_single
        CHECK (requested_model_type IN ('RGB_ONLY', 'THERMAL_ONLY'));

ALTER TABLE analysis_jobs
    ADD CONSTRAINT chk_analysis_jobs_model_type_single
        CHECK (model_type IN ('RGB_ONLY', 'THERMAL_ONLY'));

ALTER TABLE analysis_results
    ADD CONSTRAINT chk_analysis_results_model_type_single
        CHECK (model_type IN ('RGB_ONLY', 'THERMAL_ONLY'));

ALTER TABLE detected_defects
    ADD CONSTRAINT chk_detected_defects_defect_source_single
        CHECK (defect_source IN ('RGB', 'THERMAL'));

DROP TABLE image_pairs;
