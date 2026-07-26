-- Versioned foundation migration for databases created before the relational
-- integrity hardening was added to schema.sql.
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_permissions_role ON permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_employment_contracts_employee ON employment_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_employee ON timesheets(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_timesheets_shift ON timesheets(shift_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_employee ON payrolls(employee_id, pay_month);
CREATE INDEX IF NOT EXISTS idx_areas_parent ON areas(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_branch ON departments(branch_id);
CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department_id);
CREATE INDEX IF NOT EXISTS idx_teams_manager ON teams(manager_id);
CREATE INDEX IF NOT EXISTS idx_locations_area ON locations(area_id);
CREATE INDEX IF NOT EXISTS idx_locations_branch ON locations(branch_id);
CREATE INDEX IF NOT EXISTS idx_containers_location ON containers(location_id);
CREATE INDEX IF NOT EXISTS idx_containers_branch ON containers(branch_id);
CREATE INDEX IF NOT EXISTS idx_trucks_driver ON trucks(driver_id);
CREATE INDEX IF NOT EXISTS idx_trucks_branch ON trucks(branch_id);
CREATE INDEX IF NOT EXISTS idx_trips_truck ON trips(truck_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_branch ON orders(branch_id);
