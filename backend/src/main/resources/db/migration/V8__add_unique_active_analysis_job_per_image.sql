CREATE UNIQUE INDEX ux_analysis_jobs_one_active_per_image
    ON analysis_jobs (image_id)
    WHERE job_status IN ('QUEUED', 'RUNNING');
