CREATE TABLE IF NOT EXISTS crm_stage (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  sequence INTEGER NOT NULL,
  folded BOOLEAN DEFAULT false,
  requirements VARCHAR DEFAULT ''
);

CREATE TABLE IF NOT EXISTS crm_partner (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR
);

CREATE TABLE IF NOT EXISTS res_user (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR,
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS crm_team (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  quota DOUBLE DEFAULT 0,
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS crm_team_member (
  team_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL,
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS crm_tag (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  color VARCHAR
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
  source VARCHAR,
  campaign VARCHAR,
  team VARCHAR,
  salesperson VARCHAR,
  expected_revenue DOUBLE DEFAULT 0,
  recurring_revenue DOUBLE DEFAULT 0,
  recurring_plan_id VARCHAR,
  priority INTEGER DEFAULT 0,
  tags VARCHAR,
  probability DOUBLE DEFAULT 0,
  expected_closing DATE,
  next_activity VARCHAR,
  notes VARCHAR,
  converted_at TIMESTAMP,
  active BOOLEAN DEFAULT true,
  write_version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS crm_message (
  id VARCHAR PRIMARY KEY,
  lead_id VARCHAR NOT NULL,
  author VARCHAR NOT NULL,
  body VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS crm_lead_tag (
  lead_id VARCHAR NOT NULL,
  tag_id VARCHAR NOT NULL,
  PRIMARY KEY (lead_id, tag_id)
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
  stored_path VARCHAR,
  mime_type VARCHAR,
  file_size BIGINT,
  created_at TIMESTAMP DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS crm_lost_reason (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_config (
  key VARCHAR PRIMARY KEY,
  value VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_activity_type (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  default_summary VARCHAR NOT NULL DEFAULT '',
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS crm_activity_plan (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS crm_recurring_plan (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  interval_number INTEGER NOT NULL DEFAULT 1,
  interval_unit VARCHAR NOT NULL DEFAULT 'month',
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS crm_import_history (
  id VARCHAR PRIMARY KEY,
  imported_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors VARCHAR NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT current_timestamp
);
