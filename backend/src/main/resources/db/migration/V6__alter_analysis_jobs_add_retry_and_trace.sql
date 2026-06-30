ALTER TABLE analysis_jobs
    ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE analysis_jobs
    ADD COLUMN trace_id VARCHAR(255);

CREATE INDEX idx_analysis_jobs_trace_id ON analysis_jobs (trace_id);
