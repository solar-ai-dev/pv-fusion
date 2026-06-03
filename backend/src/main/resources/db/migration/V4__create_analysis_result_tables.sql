CREATE TABLE analysis_jobs (
    id BIGSERIAL PRIMARY KEY,
    image_id BIGINT REFERENCES inspection_images (id),
    image_pair_id BIGINT REFERENCES image_pairs (id),
    input_type VARCHAR(30) NOT NULL,
    requested_model_type VARCHAR(50) NOT NULL,
    model_type VARCHAR(30) NOT NULL,
    job_status VARCHAR(30) NOT NULL,
    requested_by_user_id BIGINT NOT NULL REFERENCES users (id),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failure_code VARCHAR(100),
    failure_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_analysis_jobs_single_target CHECK (
        (image_id IS NOT NULL AND image_pair_id IS NULL)
        OR (image_id IS NULL AND image_pair_id IS NOT NULL)
    )
);

CREATE INDEX idx_analysis_jobs_image_id ON analysis_jobs (image_id);
CREATE INDEX idx_analysis_jobs_image_pair_id ON analysis_jobs (image_pair_id);
CREATE INDEX idx_analysis_jobs_job_status ON analysis_jobs (job_status);

CREATE TABLE analysis_results (
    id BIGSERIAL PRIMARY KEY,
    analysis_job_id BIGINT NOT NULL REFERENCES analysis_jobs (id),
    model_type VARCHAR(30) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    model_format VARCHAR(50) NOT NULL,
    runtime VARCHAR(50) NOT NULL,
    input_size INTEGER NOT NULL,
    threshold NUMERIC(10, 4) NOT NULL,
    result_status VARCHAR(30) NOT NULL,
    anomaly_count INTEGER NOT NULL DEFAULT 0,
    max_confidence NUMERIC(10, 4),
    area_ratio NUMERIC(10, 4),
    severity_score NUMERIC(10, 4),
    severity_level VARCHAR(30) NOT NULL,
    action_candidate VARCHAR(50) NOT NULL,
    priority_level VARCHAR(30) NOT NULL,
    review_status VARCHAR(30) NOT NULL,
    bbox_bucket_name VARCHAR(255),
    bbox_object_key VARCHAR(1024),
    bbox_file_url VARCHAR(1024),
    heatmap_bucket_name VARCHAR(255),
    heatmap_object_key VARCHAR(1024),
    heatmap_file_url VARCHAR(1024),
    mask_bucket_name VARCHAR(255),
    mask_object_key VARCHAR(1024),
    mask_file_url VARCHAR(1024),
    analyzed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_analysis_results_analysis_job_id UNIQUE (analysis_job_id)
);

CREATE INDEX idx_analysis_results_analysis_job_id ON analysis_results (analysis_job_id);

CREATE TABLE detected_defects (
    id BIGSERIAL PRIMARY KEY,
    analysis_result_id BIGINT NOT NULL REFERENCES analysis_results (id),
    defect_type VARCHAR(50) NOT NULL,
    defect_source VARCHAR(30) NOT NULL,
    confidence NUMERIC(10, 4),
    area_ratio NUMERIC(10, 4),
    bbox_x INTEGER,
    bbox_y INTEGER,
    bbox_width INTEGER,
    bbox_height INTEGER,
    mask_bucket_name VARCHAR(255),
    mask_object_key VARCHAR(1024),
    mask_file_url VARCHAR(1024),
    severity_score NUMERIC(10, 4),
    severity_level VARCHAR(30) NOT NULL,
    action_candidate VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_detected_defects_analysis_result_id ON detected_defects (analysis_result_id);

CREATE TABLE result_review_histories (
    id BIGSERIAL PRIMARY KEY,
    analysis_result_id BIGINT NOT NULL REFERENCES analysis_results (id),
    reviewer_user_id BIGINT NOT NULL REFERENCES users (id),
    previous_review_status VARCHAR(30),
    new_review_status VARCHAR(30) NOT NULL,
    previous_action_candidate VARCHAR(50),
    new_action_candidate VARCHAR(50) NOT NULL,
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_result_review_histories_analysis_result_id
    ON result_review_histories (analysis_result_id);
