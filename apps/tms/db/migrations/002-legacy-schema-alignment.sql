-- Move the historical additive startup changes into a tracked, repeatable
-- migration. Every statement is idempotent so existing demo databases keep
-- their records while receiving the current parity schema.
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS capacity_kg INTEGER DEFAULT 0;
ALTER TABLE system_activity ADD COLUMN IF NOT EXISTS actor_id VARCHAR;
ALTER TABLE system_activity ADD COLUMN IF NOT EXISTS resource_id VARCHAR;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS cost_amount DECIMAL(18,2) DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS profit_amount DECIMAL(18,2) DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS branch_id VARCHAR;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS branch_id VARCHAR;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS branch_id VARCHAR;
ALTER TABLE containers ADD COLUMN IF NOT EXISTS branch_id VARCHAR;
ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS prefix VARCHAR;
ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS sequence_width INTEGER DEFAULT 4;
ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS reset_cadence VARCHAR DEFAULT 'never';
ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS next_sequence BIGINT DEFAULT 1;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS manager_id VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS view_scope VARCHAR DEFAULT 'all';
UPDATE roles SET view_scope = 'all' WHERE view_scope IS NULL;
ALTER TABLE areas ADD COLUMN IF NOT EXISTS parent_id VARCHAR;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS parent_id VARCHAR;
ALTER TABLE accounting_entries ADD COLUMN IF NOT EXISTS linked_advance_id VARCHAR;
ALTER TABLE accounting_entries ADD COLUMN IF NOT EXISTS parent_id VARCHAR;
ALTER TABLE accounting_entries ADD COLUMN IF NOT EXISTS branch_id VARCHAR;
CREATE TABLE IF NOT EXISTS currency_rates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code VARCHAR NOT NULL UNIQUE,
  rate_to_vnd DECIMAL(18,6) NOT NULL CHECK (rate_to_vnd > 0),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source VARCHAR NOT NULL DEFAULT 'demo-config',
  synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_currency_rates_code ON currency_rates(currency_code);
INSERT INTO order_workflow_states(order_id, status)
SELECT o.id, o.status
FROM orders o
WHERE NOT EXISTS (SELECT 1 FROM order_workflow_states s WHERE s.order_id = o.id);
CREATE INDEX IF NOT EXISTS idx_system_activity_resource ON system_activity(resource, resource_id);
UPDATE trucks SET capacity_kg = CASE type
  WHEN 'Semi' THEN 20000 WHEN 'Flatbed' THEN 18000
  WHEN 'Box Truck' THEN 5000 ELSE 0 END
WHERE capacity_kg IS NULL OR capacity_kg = 0;
INSERT INTO permissions(id, role_id, permission_key)
SELECT 'perm-adm-13', id, 'crm.read'
FROM roles
WHERE name = 'admin'
  AND NOT EXISTS (SELECT 1 FROM permissions WHERE id = 'perm-adm-13');
INSERT INTO permissions(id, role_id, permission_key)
SELECT 'perm-adm-14', id, 'crm.write'
FROM roles
WHERE name = 'admin'
  AND NOT EXISTS (SELECT 1 FROM permissions WHERE id = 'perm-adm-14');
