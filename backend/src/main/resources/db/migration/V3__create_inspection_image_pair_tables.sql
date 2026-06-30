CREATE TABLE inspections (
    id BIGSERIAL PRIMARY KEY,
    zone_id BIGINT NOT NULL REFERENCES zones (id),
    name VARCHAR(150) NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE,
    capture_method VARCHAR(30) NOT NULL,
    inspector_name VARCHAR(100),
    memo TEXT,
    inspection_status VARCHAR(30) NOT NULL,
    created_by_user_id BIGINT NOT NULL REFERENCES users (id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inspections_zone_id ON inspections (zone_id);
CREATE INDEX idx_inspections_captured_at ON inspections (captured_at);

CREATE TABLE inspection_images (
    id BIGSERIAL PRIMARY KEY,
    inspection_id BIGINT NOT NULL REFERENCES inspections (id),
    equipment_id BIGINT REFERENCES equipments (id),
    target_type VARCHAR(30) NOT NULL,
    image_type VARCHAR(30) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    bucket_name VARCHAR(255) NOT NULL,
    object_key VARCHAR(1024) NOT NULL,
    file_url VARCHAR(1024),
    captured_at TIMESTAMP WITH TIME ZONE,
    upload_status VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    uploaded_by_user_id BIGINT NOT NULL REFERENCES users (id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inspection_images_inspection_id ON inspection_images (inspection_id);
CREATE INDEX idx_inspection_images_equipment_id ON inspection_images (equipment_id);
CREATE INDEX idx_inspection_images_image_type ON inspection_images (image_type);
CREATE INDEX idx_inspection_images_target_type ON inspection_images (target_type);
CREATE INDEX idx_inspection_images_duplicate_check
    ON inspection_images (inspection_id, target_type, equipment_id, image_type, status);

CREATE TABLE image_pairs (
    id BIGSERIAL PRIMARY KEY,
    inspection_id BIGINT NOT NULL REFERENCES inspections (id),
    equipment_id BIGINT REFERENCES equipments (id),
    target_type VARCHAR(30) NOT NULL,
    rgb_image_id BIGINT NOT NULL REFERENCES inspection_images (id),
    thermal_image_id BIGINT NOT NULL REFERENCES inspection_images (id),
    status VARCHAR(30) NOT NULL,
    created_by_user_id BIGINT NOT NULL REFERENCES users (id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_image_pairs_rgb_thermal_different CHECK (rgb_image_id <> thermal_image_id),
    CONSTRAINT uq_image_pairs_rgb_image_id UNIQUE (rgb_image_id),
    CONSTRAINT uq_image_pairs_thermal_image_id UNIQUE (thermal_image_id)
);

CREATE INDEX idx_image_pairs_inspection_id ON image_pairs (inspection_id);
CREATE INDEX idx_image_pairs_equipment_id ON image_pairs (equipment_id);
CREATE INDEX idx_image_pairs_rgb_image_id ON image_pairs (rgb_image_id);
CREATE INDEX idx_image_pairs_thermal_image_id ON image_pairs (thermal_image_id);
