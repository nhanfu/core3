import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const schema = readFileSync(resolve(process.cwd(), 'db', 'schema.sql'), 'utf8');
const migration = readFileSync(resolve(process.cwd(), 'db', 'migrations', '001-relational-indexes.sql'), 'utf8');
const alignmentMigration = readFileSync(resolve(process.cwd(), 'db', 'migrations', '002-legacy-schema-alignment.sql'), 'utf8');
const crmMigration = readFileSync(resolve(process.cwd(), 'db', 'migrations', '003-mutable-crm-parents.sql'), 'utf8');
const financialMigration = readFileSync(resolve(process.cwd(), 'db', 'migrations', '004-mutable-financial-parents.sql'), 'utf8');
const scopeMigration = readFileSync(resolve(process.cwd(), 'db', 'migrations', '005-scope-indexes.sql'), 'utf8');
const crmScopeMigration = readFileSync(resolve(process.cwd(), 'db', 'migrations', '006-crm-scope-indexes.sql'), 'utf8');
const notificationMigration = readFileSync(resolve(process.cwd(), 'db', 'migrations', '007-notification-scope-index.sql'), 'utf8');
const relationshipQueryMigration = readFileSync(resolve(process.cwd(), 'db', 'migrations', '008-relationship-query-indexes.sql'), 'utf8');
const tripScopeMigration = readFileSync(resolve(process.cwd(), 'db', 'migrations', '009-trip-branch-scope.sql'), 'utf8');
const server = readFileSync(resolve(process.cwd(), '..', 'server.ts'), 'utf8');
const migrationFiles = readdirSync(resolve(process.cwd(), 'db', 'migrations')).filter(file => file.endsWith('.sql')).sort();

describe('database relationship contract', () => {
  it('declares organization and fleet foreign keys', () => {
    const relationships = [
      'role_id VARCHAR NOT NULL REFERENCES roles(id)',
      'employee_id VARCHAR NOT NULL REFERENCES employees(id)',
      'branch_id VARCHAR REFERENCES branches(id)',
      'department_id VARCHAR REFERENCES departments(id)',
      'manager_id VARCHAR REFERENCES employees(id)',
      'location_id VARCHAR REFERENCES locations(id)',
      'driver_id VARCHAR REFERENCES drivers(id)',
      'truck_id VARCHAR REFERENCES trucks(id)',
      'shift_id VARCHAR REFERENCES work_shifts(id)',
    ];
    for (const relationship of relationships) expect(schema).toContain(relationship);
  });

  it('indexes relationship columns used by scope and hierarchy queries', () => {
    const indexes = [
      'idx_users_branch',
      'idx_users_department',
      'idx_departments_parent',
      'idx_departments_branch',
      'idx_teams_department',
      'idx_locations_area',
      'idx_locations_branch',
      'idx_containers_location',
      'idx_trucks_driver',
      'idx_trucks_branch',
      'idx_trips_truck',
      'idx_trips_driver',
      'idx_trips_branch',
      'idx_orders_branch',
      'idx_quotes_branch',
      'idx_accounting_entries_branch',
    ];
    for (const index of indexes) expect(schema).toContain(index);
  });

  it('keeps the relational hardening upgrade versioned and idempotent', () => {
    expect(migration).toContain('CREATE INDEX IF NOT EXISTS idx_users_branch');
    expect(migration).toContain('CREATE INDEX IF NOT EXISTS idx_orders_branch');
    expect(server).toContain('CREATE TABLE IF NOT EXISTS schema_migrations');
    expect(server).toContain("INSERT INTO schema_migrations(version) VALUES(?)");
    expect(migrationFiles).toEqual([
      '001-relational-indexes.sql',
      '002-legacy-schema-alignment.sql',
      '003-mutable-crm-parents.sql',
      '004-mutable-financial-parents.sql',
      '005-scope-indexes.sql',
      '006-crm-scope-indexes.sql',
      '007-notification-scope-index.sql',
      '008-relationship-query-indexes.sql',
      '009-trip-branch-scope.sql',
    ]);
    for (const file of migrationFiles) {
      expect(readFileSync(resolve(process.cwd(), 'db', 'migrations', file), 'utf8')).toContain('CREATE');
    }
  });

  it('keeps legacy additive schema alignment out of server startup code', () => {
    expect(alignmentMigration).toContain('ALTER TABLE trucks ADD COLUMN IF NOT EXISTS capacity_kg');
    expect(alignmentMigration).toContain('INSERT INTO order_workflow_states');
    expect(server).not.toContain('ALTER TABLE trucks ADD COLUMN IF NOT EXISTS capacity_kg');
  });

  it('keeps mutable CRM parent links repository-owned', () => {
    expect(schema).toContain('customer_id VARCHAR NOT NULL,');
    expect(schema).toContain('partner_id VARCHAR NOT NULL,');
    expect(crmMigration).toContain('DROP TABLE customer_contacts');
    expect(crmMigration).toContain('DROP TABLE partner_contacts');
  });

  it('keeps mutable financial document links repository-owned', () => {
    expect(schema).toContain('entry_id VARCHAR NOT NULL,');
    expect(financialMigration).toContain('DROP TABLE accounting_entry_lines');
    expect(financialMigration).toContain('idx_accounting_entry_lines_entry');
  });

  it('indexes branch-scoped commercial and accounting records in the next migration', () => {
    expect(schema).toContain('CREATE INDEX IF NOT EXISTS idx_quotes_branch ON quotes(branch_id)');
    expect(schema).toContain('CREATE INDEX IF NOT EXISTS idx_accounting_entries_branch ON accounting_entries(branch_id)');
    expect(scopeMigration).toContain('CREATE INDEX IF NOT EXISTS idx_quotes_branch ON quotes(branch_id)');
    expect(scopeMigration).toContain('CREATE INDEX IF NOT EXISTS idx_accounting_entries_branch ON accounting_entries(branch_id)');
  });

  it('indexes CRM visibility, ownership, lifecycle, and type predicates', () => {
    for (const index of [
      'idx_customers_visibility_owner',
      'idx_customers_stage_status',
      'idx_partners_visibility_owner',
      'idx_partners_type_status',
    ]) {
      expect(schema).toContain(`CREATE INDEX IF NOT EXISTS ${index}`);
      expect(crmScopeMigration).toContain(`CREATE INDEX IF NOT EXISTS ${index}`);
    }
  });

  it('indexes user-scoped notification reads and read-state updates', () => {
    const index = 'CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, read, created_at)';
    expect(schema).toContain(index);
    expect(notificationMigration).toContain(index);
  });

  it('indexes relationship and drill-down query paths', () => {
    for (const index of [
      'idx_drivers_assigned_truck',
      'idx_maintenance_truck_date',
      'idx_maintenance_technician',
      'idx_accounting_entries_linked_advance',
      'idx_accounting_entries_parent',
      'idx_system_activity_resource',
    ]) {
      expect(schema).toContain(`CREATE INDEX IF NOT EXISTS ${index}`);
      expect(relationshipQueryMigration).toContain(`CREATE INDEX IF NOT EXISTS ${index}`);
    }
  });

  it('gives trips an explicit branch scope for unassigned vehicles', () => {
    expect(schema).toContain('branch_id VARCHAR REFERENCES branches(id)');
    expect(schema).toContain('CREATE INDEX IF NOT EXISTS idx_trips_branch ON trips(branch_id)');
    expect(tripScopeMigration).toContain('ALTER TABLE trips ADD COLUMN IF NOT EXISTS branch_id VARCHAR');
    expect(tripScopeMigration).toContain('SET branch_id =');
  });
});
