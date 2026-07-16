ALTER TABLE detected_defects
    ADD COLUMN model_class_id INTEGER,
    ADD COLUMN model_class_name VARCHAR(100);
