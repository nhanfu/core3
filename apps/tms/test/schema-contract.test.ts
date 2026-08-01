import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const server = readFileSync(resolve(process.cwd(), '..', 'server.ts'), 'utf8');
const dbInit = readFileSync(resolve(process.cwd(), 'db', 'init.ts'), 'utf8');
const migrationRunner = readFileSync(resolve(process.cwd(), '../../apps/lib/server/migrations.ts'), 'utf8');
const migrationRoot = resolve(process.cwd(), 'db', 'migrations');
const migrationFiles = readdirSync(migrationRoot)
  .filter(file => /^\d{14}-\d{3,}-[a-z0-9]+(?:-[a-z0-9]+)*\.ya?ml$/.test(file))
  .sort();
const migration = (order: string) => {
  const file = migrationFiles.find(name => name.includes(`-${order}-`));
  if (!file) throw new Error(`Missing migration ${order}`);
  return (Bun.YAML.parse(readFileSync(resolve(migrationRoot, file), 'utf8')) as { up: string }).up;
};
const migrationDown = (file: string) =>
  (Bun.YAML.parse(readFileSync(resolve(migrationRoot, file), 'utf8')) as { down: string }).down;
const schema = migration('001');
const alignmentMigration = migration('002');
const crmMigration = migration('003');
const financialMigration = migration('004');
const scopeMigration = migration('005');
const crmScopeMigration = migration('006');
const notificationMigration = migration('007');
const relationshipQueryMigration = migration('008');
const tripScopeMigration = migration('009');

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
    expect(migration('001')).toContain('CREATE INDEX IF NOT EXISTS idx_users_branch');
    expect(migration('001')).toContain('CREATE INDEX IF NOT EXISTS idx_orders_branch');
    expect(migrationRunner).toContain('CREATE TABLE IF NOT EXISTS schema_migrations');
    expect(migrationRunner).toContain("INSERT INTO schema_migrations(version) VALUES(?)");
    expect(migrationFiles).toEqual([
      '20260801090000-001-foundation-indexes.yaml',
      '20260801090000-002-schema-alignment-and-currency.yaml',
      '20260801090000-003-customer-contact-links.yaml',
      '20260801090000-004-accounting-line-links.yaml',
      '20260801090000-005-branch-scope-indexes.yaml',
      '20260801090000-006-crm-scope-indexes.yaml',
      '20260801090000-007-notification-index.yaml',
      '20260801090000-008-relationship-query-indexes.yaml',
      '20260801090000-009-trip-branch-scope.yaml',
    ]);
    expect(readdirSync(migrationRoot).sort()).toEqual(migrationFiles);
    for (const file of migrationFiles) {
      expect(migration(file.slice(15, 18))).toContain('CREATE');
      expect(migrationDown(file)).toBeTruthy();
    }
  });

  it('keeps legacy additive schema alignment out of server startup code', () => {
    expect(alignmentMigration).toContain('ALTER TABLE trucks ADD COLUMN IF NOT EXISTS capacity_kg');
    expect(alignmentMigration).toContain('INSERT INTO order_workflow_states');
    expect(server).not.toContain('ALTER TABLE trucks ADD COLUMN IF NOT EXISTS capacity_kg');
    expect(dbInit).not.toContain('schema.sql');
    expect(dbInit).not.toContain('seed.sql');
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
