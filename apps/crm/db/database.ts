import duckdb from 'duckdb';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const db = new duckdb.Database(process.env.CRM_DB_PATH || join(import.meta.dir, 'crm.duckdb'));

export function run(connection: any, sql: string, params: any[] = []) {
  return new Promise<void>((resolve, reject) => connection.run(sql, ...params, (error: any) => error ? reject(error) : resolve()));
}

export function all(connection: any, sql: string, params: any[] = []) {
  return new Promise<any[]>((resolve, reject) => connection.all(sql, ...params, (error: any, rows: any[]) => {
    if (error) return reject(error);
    resolve((rows || []).map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'bigint' ? Number(value) : value]))));
  }));
}

export async function withDb<T>(callback: (connection: any) => Promise<T>) {
  const connection = db.connect();
  try { return await callback(connection); } finally { await new Promise<void>(resolve => connection.close(() => resolve())); }
}

export async function initDatabase() {
  await withDb(async connection => {
    for (const statement of readFileSync(join(import.meta.dir, 'schema.sql'), 'utf8').split(';').map(sql => sql.trim()).filter(Boolean)) await run(connection, statement);
    for (const column of [
      'contact_name VARCHAR', 'email VARCHAR', 'phone VARCHAR', 'source VARCHAR', 'campaign VARCHAR', 'team VARCHAR',
      'probability DOUBLE DEFAULT 0', 'expected_closing DATE', 'notes VARCHAR', 'converted_at TIMESTAMP', 'recurring_revenue DOUBLE DEFAULT 0', 'recurring_plan_id VARCHAR',
      'partner_id VARCHAR', 'team_id VARCHAR', 'salesperson_id VARCHAR',
      'write_version INTEGER DEFAULT 1',
    ]) await run(connection, `ALTER TABLE crm_lead ADD COLUMN IF NOT EXISTS ${column}`);
    await run(connection, 'ALTER TABLE crm_team ADD COLUMN IF NOT EXISTS quota DOUBLE DEFAULT 0');
    await run(connection, 'ALTER TABLE crm_stage ADD COLUMN IF NOT EXISTS requirements VARCHAR DEFAULT \'\'');
    await run(connection, 'CREATE TABLE IF NOT EXISTS crm_team_member (team_id VARCHAR NOT NULL, user_id VARCHAR NOT NULL, PRIMARY KEY (team_id, user_id))');
    await run(connection, 'CREATE TABLE IF NOT EXISTS crm_import_history (id VARCHAR PRIMARY KEY, imported_count INTEGER NOT NULL DEFAULT 0, error_count INTEGER NOT NULL DEFAULT 0, errors VARCHAR NOT NULL DEFAULT \'[]\', created_at TIMESTAMP DEFAULT current_timestamp)');
    for (const statement of readFileSync(join(import.meta.dir, 'seed.sql'), 'utf8').split(';').map(sql => sql.trim()).filter(Boolean)) await run(connection, statement);
    for (const column of ['stored_path VARCHAR', 'mime_type VARCHAR', 'file_size BIGINT']) await run(connection, `ALTER TABLE crm_attachment ADD COLUMN IF NOT EXISTS ${column}`);
    await run(connection, `UPDATE crm_lead SET team = CASE
      WHEN id IN ('opp-001', 'opp-004', 'opp-006') THEN 'North America'
      WHEN id IN ('opp-002', 'opp-005') THEN 'Europe'
      ELSE 'Asia Pacific'
    END WHERE coalesce(team, '') = ''`);
    await run(connection, `UPDATE crm_lead SET source = CASE WHEN id IN ('lead-001', 'opp-001') THEN 'Website' WHEN id IN ('lead-002', 'opp-004') THEN 'Referral' ELSE 'Email' END WHERE coalesce(source, '') = ''`);
    await run(connection, `UPDATE crm_lead SET campaign = CASE WHEN id IN ('lead-001', 'opp-001') THEN 'Summer campaign' WHEN id IN ('lead-002', 'opp-004') THEN 'Partner campaign' ELSE 'Renewal campaign' END WHERE coalesce(campaign, '') = ''`);
    await run(connection, `UPDATE crm_lead SET recurring_revenue = CASE WHEN id = 'opp-004' THEN 1200 WHEN id = 'opp-006' THEN 1800 ELSE coalesce(recurring_revenue, 0) END, recurring_plan_id = CASE WHEN id IN ('opp-004', 'opp-006') THEN 'recurring-monthly' ELSE recurring_plan_id END WHERE id IN ('opp-004', 'opp-006')`);
    await run(connection, `UPDATE crm_lead l SET partner_id = p.id FROM crm_partner p WHERE l.partner_id IS NULL AND lower(l.partner_name) = lower(p.name)`);
    await run(connection, `UPDATE crm_lead l SET team_id = t.id FROM crm_team t WHERE l.team_id IS NULL AND lower(l.team) = lower(t.name)`);
    await run(connection, `UPDATE crm_lead l SET salesperson_id = u.id FROM res_user u WHERE l.salesperson_id IS NULL AND lower(l.salesperson) = lower(u.name)`);
    await run(connection, `INSERT INTO crm_lead_tag(lead_id, tag_id)
      SELECT l.id, t.id FROM crm_lead l CROSS JOIN UNNEST(string_split(coalesce(l.tags, ''), ',')) raw(tag_name)
      JOIN crm_tag t ON lower(trim(raw.tag_name)) = lower(t.name)
      ON CONFLICT DO NOTHING`);
  });
}
