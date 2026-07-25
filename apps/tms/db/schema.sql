CREATE TABLE IF NOT EXISTS branches (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  city VARCHAR NOT NULL,
  region VARCHAR,
  status VARCHAR DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL UNIQUE,
  description VARCHAR
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  password_hash VARCHAR NOT NULL,
  avatar_url VARCHAR,
  preferred_lang VARCHAR DEFAULT 'en',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id VARCHAR NOT NULL,
  role_id VARCHAR NOT NULL,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS permissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id VARCHAR NOT NULL,
  permission_key VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS drivers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  phone VARCHAR,
  email VARCHAR,
  license_number VARCHAR,
  license_expiry DATE,
  status VARCHAR DEFAULT 'Active',
  assigned_truck_id VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trucks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  plate VARCHAR NOT NULL UNIQUE,
  model VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'Active',
  mileage INTEGER DEFAULT 0,
  driver_id VARCHAR,
  last_service DATE,
  next_service DATE,
  branch_id VARCHAR,
  notes VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trips (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_number VARCHAR NOT NULL UNIQUE,
  truck_id VARCHAR,
  driver_id VARCHAR,
  origin VARCHAR NOT NULL,
  destination VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'Scheduled',
  departure_time TIMESTAMP,
  arrival_time TIMESTAMP,
  distance_km DECIMAL(10,2),
  cargo_type VARCHAR,
  cargo_weight DECIMAL(10,2),
  notes VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id VARCHAR NOT NULL,
  service_type VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'Scheduled',
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  technician_id VARCHAR,
  cost DECIMAL(10,2),
  notes VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  body VARCHAR,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS translations_id_seq START 1;

CREATE TABLE IF NOT EXISTS translations (
  id INTEGER PRIMARY KEY DEFAULT nextval('translations_id_seq'),
  lang VARCHAR NOT NULL,
  page VARCHAR NOT NULL,
  component VARCHAR,
  text VARCHAR NOT NULL,
  translated VARCHAR NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_translations ON translations(lang, page, coalesce(component, ''), text);
