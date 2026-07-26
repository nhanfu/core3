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
