CREATE TABLE zones (
    id BIGSERIAL PRIMARY KEY,
    plant_id BIGINT NOT NULL REFERENCES plants (id),
    name VARCHAR(150) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    status VARCHAR(30) NOT NULL,
    created_by_user_id BIGINT NOT NULL REFERENCES users (id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_zones_plant_id ON zones (plant_id);

CREATE TABLE equipments (
    id BIGSERIAL PRIMARY KEY,
    zone_id BIGINT NOT NULL REFERENCES zones (id),
    parent_equipment_id BIGINT REFERENCES equipments (id),
    equipment_type VARCHAR(30) NOT NULL,
    name VARCHAR(150) NOT NULL,
    position_code VARCHAR(100),
    status VARCHAR(30) NOT NULL,
    created_by_user_id BIGINT NOT NULL REFERENCES users (id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_equipments_zone_id ON equipments (zone_id);
CREATE INDEX idx_equipments_parent_equipment_id ON equipments (parent_equipment_id);
