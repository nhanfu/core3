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

CREATE TABLE IF NOT EXISTS chat_threads (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  thread_type VARCHAR NOT NULL DEFAULT 'Group' CHECK (thread_type IN ('Direct', 'Group')),
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_participants (
  thread_id VARCHAR NOT NULL REFERENCES chat_threads(id),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_read_at TIMESTAMP,
  PRIMARY KEY (thread_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id, thread_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id VARCHAR NOT NULL REFERENCES chat_threads(id),
  sender_id VARCHAR NOT NULL REFERENCES users(id),
  body VARCHAR NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  edited_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id, created_at);

CREATE TABLE IF NOT EXISTS chat_attachments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id VARCHAR NOT NULL REFERENCES chat_messages(id),
  file_name VARCHAR NOT NULL,
  mime_type VARCHAR,
  size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  storage_key VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_message ON chat_attachments(message_id);

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

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  tax_code VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  stage VARCHAR DEFAULT 'Lead' CHECK (stage IN ('Lead', 'Contacting', 'Customer')),
  owner_name VARCHAR,
  visibility VARCHAR DEFAULT 'Public' CHECK (visibility IN ('Public', 'Private')),
  status VARCHAR DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS customer_contacts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL REFERENCES customers(id),
  name VARCHAR NOT NULL,
  role_title VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer ON customer_contacts(customer_id);

CREATE TABLE IF NOT EXISTS quotes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), code VARCHAR NOT NULL UNIQUE, customer_name VARCHAR NOT NULL,
  title VARCHAR NOT NULL, amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  cost_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  profit_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  status VARCHAR NOT NULL DEFAULT 'Draft',
  valid_until DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS quote_lines (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id VARCHAR NOT NULL REFERENCES quotes(id),
  sequence INTEGER NOT NULL DEFAULT 10,
  description VARCHAR NOT NULL,
  quantity DECIMAL(18,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit VARCHAR NOT NULL DEFAULT 'Chuyến',
  unit_price DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  cost_price DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  line_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  cost_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(quote_id, sequence)
);
CREATE INDEX IF NOT EXISTS idx_quote_lines_quote ON quote_lines(quote_id);

CREATE TABLE IF NOT EXISTS partners (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  tax_code VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  partner_type VARCHAR DEFAULT 'Supplier' CHECK (partner_type IN ('Carrier', 'Supplier', 'ShippingLine', 'Warehouse', 'Depot', 'Other')),
  owner_name VARCHAR,
  visibility VARCHAR DEFAULT 'Public' CHECK (visibility IN ('Public', 'Private')),
  status VARCHAR DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS partner_contacts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id VARCHAR NOT NULL REFERENCES partners(id),
  name VARCHAR NOT NULL,
  role_title VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_partner_contacts_partner ON partner_contacts(partner_id);

CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  job_title VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  department VARCHAR,
  start_date DATE,
  dependents INTEGER NOT NULL DEFAULT 0 CHECK (dependents >= 0),
  status VARCHAR NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'OnLeave', 'Inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employment_contracts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  employee_id VARCHAR NOT NULL,
  contract_type VARCHAR NOT NULL DEFAULT 'FixedTerm' CHECK (contract_type IN ('Probation', 'FixedTerm', 'Indefinite')),
  start_date DATE NOT NULL,
  end_date DATE,
  base_salary DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
  status VARCHAR NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Expiring', 'Expired', 'Terminated')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS employee_documents (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR NOT NULL REFERENCES employees(id),
  file_name VARCHAR NOT NULL,
  mime_type VARCHAR,
  size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (size_bytes > 0),
  storage_key VARCHAR NOT NULL,
  uploaded_by VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id, created_at);

CREATE TABLE IF NOT EXISTS work_shifts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  start_time VARCHAR NOT NULL,
  end_time VARCHAR NOT NULL,
  break_minutes INTEGER NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),
  status VARCHAR NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timesheets (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR NOT NULL,
  work_date DATE NOT NULL,
  shift_id VARCHAR,
  hours DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (hours >= 0 AND hours <= 24),
  status VARCHAR NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Absent', 'Leave')),
  notes VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, work_date)
);

CREATE TABLE IF NOT EXISTS payrolls (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  employee_id VARCHAR NOT NULL,
  pay_month DATE NOT NULL,
  base_salary DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
  allowance DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (allowance >= 0),
  deduction DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (deduction >= 0),
  net_salary DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (net_salary >= 0),
  status VARCHAR NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Approved', 'Paid')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, pay_month)
);

CREATE TABLE IF NOT EXISTS areas (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  region VARCHAR,
  description VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_profiles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  short_name VARCHAR,
  tax_code VARCHAR,
  address VARCHAR,
  invoice_address VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  website VARCHAR,
  bank_name VARCHAR,
  bank_account VARCHAR,
  notes VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  branch_id VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  department_id VARCHAR,
  manager_id VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  location_type VARCHAR NOT NULL DEFAULT 'Other' CHECK (location_type IN ('Port', 'Warehouse', 'Depot', 'Customer', 'Other')),
  address VARCHAR,
  city VARCHAR,
  area_id VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS containers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  container_number VARCHAR NOT NULL UNIQUE,
  container_type VARCHAR NOT NULL DEFAULT '20DC',
  owner_name VARCHAR,
  location_id VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'InUse', 'Maintenance', 'Inactive')),
  notes VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trucks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  plate VARCHAR NOT NULL UNIQUE,
  model VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'Active',
  capacity_kg INTEGER DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR NOT NULL UNIQUE,
  customer_name VARCHAR NOT NULL,
  customer_legal_name VARCHAR,
  order_date DATE NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'Draft',
  shipment_type VARCHAR,
  route VARCHAR,
  transport_method VARCHAR,
  trip_count INTEGER NOT NULL DEFAULT 0,
  total_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_by VARCHAR NOT NULL DEFAULT 'Admin User',
  notes VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
-- Workflow status is kept separately because DuckDB cannot update a parent
-- row while foreign-key children reference it.
CREATE TABLE IF NOT EXISTS order_workflow_states (
  order_id VARCHAR PRIMARY KEY REFERENCES orders(id),
  status VARCHAR NOT NULL CHECK (status IN ('Draft', 'Pending Approval', 'Approved', 'Cancelled')),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_lines (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR NOT NULL REFERENCES orders(id),
  sequence INTEGER NOT NULL DEFAULT 10,
  description VARCHAR NOT NULL,
  quantity DECIMAL(18,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit VARCHAR NOT NULL DEFAULT 'Chuyến',
  unit_price DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  line_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(order_id, sequence)
);
CREATE INDEX IF NOT EXISTS idx_order_lines_order ON order_lines(order_id);

CREATE TABLE IF NOT EXISTS master_data (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  kind VARCHAR NOT NULL CHECK (kind IN ('container_type', 'vehicle_type', 'unit', 'cargo_type', 'fee_type', 'currency')),
  code VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  description VARCHAR,
  symbol VARCHAR,
  decimals INTEGER,
  status VARCHAR NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(kind, code)
);

CREATE TABLE IF NOT EXISTS accounting_entries (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  kind VARCHAR NOT NULL CHECK (kind IN ('debit_note', 'payment_request', 'advance', 'settlement', 'invoice_template', 'ledger_account')),
  code VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  counterparty VARCHAR,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  currency VARCHAR NOT NULL DEFAULT 'VND',
  status VARCHAR NOT NULL DEFAULT 'Draft',
  document_date DATE,
  due_date DATE,
  description VARCHAR,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(kind, code)
);
CREATE TABLE IF NOT EXISTS accounting_entry_lines (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id VARCHAR NOT NULL REFERENCES accounting_entries(id),
  sequence INTEGER NOT NULL DEFAULT 10,
  description VARCHAR NOT NULL,
  quantity DECIMAL(18,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit VARCHAR NOT NULL DEFAULT 'Khoản',
  unit_price DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  line_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entry_id, sequence)
);
CREATE INDEX IF NOT EXISTS idx_accounting_entry_lines_entry ON accounting_entry_lines(entry_id);

CREATE TABLE IF NOT EXISTS system_configs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  kind VARCHAR NOT NULL CHECK (kind IN ('code_rule', 'print_template', 'approval_flow', 'shipment_type', 'trip_status', 'fee_rule', 'storage')),
  code VARCHAR NOT NULL, name VARCHAR NOT NULL, config_value VARCHAR, description VARCHAR,
  prefix VARCHAR, sequence_width INTEGER NOT NULL DEFAULT 4 CHECK (sequence_width BETWEEN 1 AND 12),
  reset_cadence VARCHAR NOT NULL DEFAULT 'never' CHECK (reset_cadence IN ('never', 'monthly', 'yearly')),
  next_sequence BIGINT NOT NULL DEFAULT 1 CHECK (next_sequence >= 1),
  status VARCHAR NOT NULL DEFAULT 'Active', sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(kind, code)
);
CREATE TABLE IF NOT EXISTS approval_flow_steps (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id VARCHAR NOT NULL REFERENCES system_configs(id),
  sequence INTEGER NOT NULL,
  name VARCHAR NOT NULL,
  approver_role VARCHAR NOT NULL,
  min_amount DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (min_amount >= 0),
  status VARCHAR NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(flow_id, sequence)
);
CREATE INDEX IF NOT EXISTS idx_approval_flow_steps_flow ON approval_flow_steps(flow_id, sequence);
CREATE TABLE IF NOT EXISTS print_template_blocks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id VARCHAR NOT NULL REFERENCES system_configs(id),
  sequence INTEGER NOT NULL,
  block_type VARCHAR NOT NULL CHECK (block_type IN ('text', 'token', 'table', 'spacer')),
  label VARCHAR NOT NULL,
  token_key VARCHAR,
  content VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(template_id, sequence)
);
CREATE INDEX IF NOT EXISTS idx_print_template_blocks_template ON print_template_blocks(template_id, sequence);
CREATE TABLE IF NOT EXISTS system_activity (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id VARCHAR,
  actor_name VARCHAR NOT NULL,
  action VARCHAR NOT NULL,
  resource VARCHAR NOT NULL,
  resource_id VARCHAR,
  detail VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_system_activity_created_at ON system_activity(created_at);

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
