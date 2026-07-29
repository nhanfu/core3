CREATE TABLE IF NOT EXISTS crm_stage (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  sequence INTEGER NOT NULL,
  folded BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS crm_partner (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR
);

CREATE TABLE IF NOT EXISTS crm_lead (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL DEFAULT 'opportunity',
  stage_id VARCHAR NOT NULL,
  partner_name VARCHAR,
  contact_name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  team VARCHAR,
  salesperson VARCHAR,
  expected_revenue DOUBLE DEFAULT 0,
  priority INTEGER DEFAULT 0,
  tags VARCHAR,
  probability DOUBLE DEFAULT 0,
  expected_closing DATE,
  next_activity VARCHAR,
  notes VARCHAR,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS crm_message (
  id VARCHAR PRIMARY KEY,
  lead_id VARCHAR NOT NULL,
  author VARCHAR NOT NULL,
  body VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS crm_activity (
  id VARCHAR PRIMARY KEY,
  lead_id VARCHAR NOT NULL,
  activity_type VARCHAR NOT NULL,
  summary VARCHAR NOT NULL,
  due_date DATE,
  done BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS crm_follower (
  id VARCHAR PRIMARY KEY,
  lead_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_attachment (
  id VARCHAR PRIMARY KEY,
  lead_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT current_timestamp
);
