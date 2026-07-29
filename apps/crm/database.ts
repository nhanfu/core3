import duckdb from 'duckdb';
import { readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { compileDomain } from '@core3/framework/services/DomainCompiler.ts';

const db = new duckdb.Database(process.env.CRM_DB_PATH || join(import.meta.dir, 'crm.duckdb'));

function run(conn: any, sql: string, params: any[] = []) {
  return new Promise<void>((resolve, reject) => conn.run(sql, ...params, (error: any) => error ? reject(error) : resolve()));
}

function all(conn: any, sql: string, params: any[] = []) {
  return new Promise<any[]>((resolve, reject) => conn.all(sql, ...params, (error: any, rows: any[]) => {
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

type AccessRole = 'salesperson' | 'manager' | 'system';

function applyOwnershipScope(conditions: string[], role: AccessRole | undefined, alias = 'l') {
  if (role === 'salesperson') conditions.push(`(${alias}.salesperson = 'Mitchell Admin' OR coalesce(${alias}.salesperson, '') = '')`);
}

export async function pipeline(search = '', options: { filter?: string; sort?: string; role?: AccessRole } = {}) {
  return withDb(async connection => {
    const rows = await listLeads(search, { type: 'opportunity', filter: options.filter, sort: options.sort, role: options.role });
    const stages = await all(connection, 'SELECT id, name, sequence, folded FROM crm_stage ORDER BY sequence');
    return stages.map(stage => ({
      id: stage.id,
      title: stage.name,
      folded: Boolean(stage.folded),
      cards: rows.filter(row => row.stage_id === stage.id).map(row => ({
        id: row.id,
        title: row.name,
        customer: row.partner_name,
        salesperson: row.salesperson,
        revenue: Number(row.expected_revenue || 0),
        priority: Number(row.priority || 0),
        tags: String(row.tags || '').split(',').filter(Boolean),
        activity: row.next_activity,
      })),
    }));
  });
}

export async function moveStage(id: string, stageId: string) {
  return withDb(async connection => {
    await run(connection, 'UPDATE crm_lead SET stage_id = ?, write_version = coalesce(write_version, 1) + 1 WHERE id = ?', [stageId, id]);
  });
}

export async function convertLead(id: string, customerName = '') {
  return withDb(async connection => {
    await run(connection, "UPDATE crm_lead SET type = 'opportunity', converted_at = current_timestamp, stage_id = CASE WHEN stage_id = 'new' THEN 'qualified' ELSE stage_id END WHERE id = ? AND type = 'lead'", [id]);
    if (customerName.trim()) {
      const existing = (await all(connection, 'SELECT id, name FROM crm_partner WHERE lower(name) = lower(?) LIMIT 1', [customerName.trim()]))[0];
      const partner = existing || { id: `partner-${crypto.randomUUID().slice(0, 8)}`, name: customerName.trim() };
      if (!existing) await run(connection, 'INSERT INTO crm_partner(id, name) VALUES(?, ?)', [partner.id, partner.name]);
      await run(connection, 'UPDATE crm_lead SET partner_id = ?, partner_name = ?, write_version = coalesce(write_version, 1) + 1 WHERE id = ?', [partner.id, partner.name, id]);
    }
    return getLead(id);
  });
}

export async function loseLead(id: string, reasonId: string) {
  return withDb(async connection => {
    const reasons = await all(connection, 'SELECT name FROM crm_lost_reason WHERE id = ?', [reasonId]);
    if (!reasons[0]) throw Object.assign(new Error('A valid lost reason is required'), { status: 400 });
    await run(connection, "UPDATE crm_lead SET stage_id = 'lost', notes = concat(coalesce(notes, ''), CASE WHEN coalesce(notes, '') = '' THEN '' ELSE '\\n' END, ?) WHERE id = ?", [`Lost reason: ${reasons[0].name}`, id]);
    return getLead(id);
  });
}

export async function lostReasons() {
  return withDb(connection => all(connection, 'SELECT id, name FROM crm_lost_reason ORDER BY name'));
}

export async function findDuplicates(id: string) {
  return withDb(async connection => {
    const current = (await all(connection, 'SELECT name, partner_name, email, phone FROM crm_lead WHERE id = ?', [id]))[0];
    if (!current) return [];
    return all(connection, `
      SELECT id, name, type, partner_name, email, phone, expected_revenue, stage_id
      FROM crm_lead WHERE active AND id <> ? AND (
        lower(name) = lower(?) OR
        (coalesce(partner_name, '') <> '' AND lower(partner_name) = lower(?)) OR
        (coalesce(email, '') <> '' AND lower(email) = lower(?)) OR
        (coalesce(phone, '') <> '' AND phone = ?)
      ) ORDER BY name
    `, [id, current.name, current.partner_name || '', current.email || '', current.phone || '']);
  });
}

export async function mergeLeads(ids: string[]) {
  return withDb(async connection => {
    const unique = [...new Set(ids)].filter(Boolean);
    if (unique.length < 2) throw Object.assign(new Error('At least two records are required to merge'), { status: 400 });
    const [primary, ...duplicates] = unique;
    const placeholders = duplicates.map(() => '?').join(',');
    await run(connection, 'BEGIN TRANSACTION');
    try {
      for (const table of ['crm_activity', 'crm_message', 'crm_follower', 'crm_attachment']) {
        await run(connection, `UPDATE ${table} SET lead_id = ? WHERE lead_id IN (${placeholders})`, [primary, ...duplicates]);
      }
      await run(connection, `DELETE FROM crm_lead WHERE id IN (${placeholders})`, duplicates);
      await run(connection, 'COMMIT');
    } catch (error) {
      await run(connection, 'ROLLBACK');
      throw error;
    }
    return { ok: true, merged_into: primary, removed: duplicates.length };
  });
}

export async function mergePreview(ids: string[]) {
  return withDb(async connection => {
    const unique = [...new Set(ids)].filter(Boolean);
    if (unique.length < 2) return { primary: null, duplicates: [] };
    const placeholders = unique.map(() => '?').join(',');
    const rows = await all(connection, `SELECT id, name, partner_name, expected_revenue FROM crm_lead WHERE id IN (${placeholders}) ORDER BY created_at, id`, unique);
    return { primary: rows[0] || null, duplicates: rows.slice(1) };
  });
}

export async function crmConfig() {
  return withDb(connection => all(connection, 'SELECT key, value FROM crm_config ORDER BY key'));
}

export async function crmStages() {
  return withDb(connection => all(connection, 'SELECT id, name, sequence, folded, requirements FROM crm_stage ORDER BY sequence'));
}

export async function saveCrmStages(rows: unknown[]) {
  return withDb(async connection => {
    for (const input of rows) {
      const row = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
      if (!String(row.id || '').trim() || !String(row.name || '').trim()) continue;
      const id = String(row.id).trim();
      const existing = (await all(connection, 'SELECT id FROM crm_stage WHERE id = ?', [id]))[0];
      if (existing) await run(connection, 'UPDATE crm_stage SET name = ?, folded = ?, requirements = ? WHERE id = ?', [String(row.name), String(row.folded) === 'true', String(row.requirements || ''), id]);
      else {
        const nextSequence = Number((await all(connection, 'SELECT coalesce(max(sequence), 0) + 1 AS sequence FROM crm_stage'))[0]?.sequence || 1);
        await run(connection, 'INSERT INTO crm_stage(id, name, sequence, folded, requirements) VALUES(?,?,?,?,?)', [id, String(row.name), nextSequence, String(row.folded) === 'true', String(row.requirements || '')]);
      }
    }
    return crmStages();
  });
}

export async function saveLostReason(id: string, name: string) {
  return withDb(async connection => {
    if (!id.trim() || !name.trim()) throw Object.assign(new Error('Lost reason id and name are required'), { status: 400 });
    await run(connection, 'INSERT INTO crm_lost_reason(id, name) VALUES(?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name', [id.trim(), name.trim()]);
    return lostReasons();
  });
}

export async function crmTags() {
  return withDb(connection => all(connection, 'SELECT id, name, color FROM crm_tag ORDER BY name'));
}

export async function saveCrmTag(id: string, name: string, color = '') {
  return withDb(async connection => {
    if (!id.trim() || !name.trim()) throw Object.assign(new Error('Tag id and name are required'), { status: 400 });
    await run(connection, 'INSERT INTO crm_tag(id, name, color) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, color=excluded.color', [id.trim(), name.trim(), color.trim()]);
    return crmTags();
  });
}

const catalogTables = {
  activity_types: 'crm_activity_type',
  activity_plans: 'crm_activity_plan',
  recurring_plans: 'crm_recurring_plan',
} as const;

export async function catalogRows(kind: keyof typeof catalogTables) {
  const table = catalogTables[kind];
  return withDb(connection => all(connection, `SELECT * FROM ${table} ORDER BY name`));
}

export async function saveCatalogRow(kind: keyof typeof catalogTables, values: Record<string, unknown>) {
  return withDb(async connection => {
    const table = catalogTables[kind];
    const id = String(values.id || '').trim();
    const name = String(values.name || '').trim();
    if (!id || !name) throw Object.assign(new Error('Catalog id and name are required'), { status: 400 });
    if (kind === 'activity_types') await run(connection, `INSERT INTO ${table}(id, name, default_summary, active) VALUES(?,?,?,true) ON CONFLICT(id) DO UPDATE SET name=excluded.name, default_summary=excluded.default_summary`, [id, name, String(values.default_summary || '')]);
    else if (kind === 'activity_plans') await run(connection, `INSERT INTO ${table}(id, name, active) VALUES(?,?,true) ON CONFLICT(id) DO UPDATE SET name=excluded.name`, [id, name]);
    else await run(connection, `INSERT INTO ${table}(id, name, interval_number, interval_unit, active) VALUES(?,?,?,?,true) ON CONFLICT(id) DO UPDATE SET name=excluded.name, interval_number=excluded.interval_number, interval_unit=excluded.interval_unit`, [id, name, Number(values.interval_number || 1), String(values.interval_unit || 'month')]);
    return catalogRows(kind);
  });
}

export async function saveCrmConfig(values: Record<string, unknown>) {
  return withDb(async connection => {
    for (const [key, value] of Object.entries(values)) {
      if (!['use_leads', 'use_recurring_revenues', 'auto_assign_leads'].includes(key)) continue;
      await run(connection, 'INSERT INTO crm_config(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, String(value) === 'true' ? 'true' : 'false']);
    }
    return crmConfig();
  });
}

const importFields = ['name', 'type', 'stage_id', 'partner_name', 'contact_name', 'email', 'phone', 'team', 'salesperson', 'source', 'campaign', 'expected_revenue', 'recurring_revenue', 'recurring_plan_id', 'probability', 'expected_closing', 'priority', 'tags', 'next_activity', 'notes'];

export async function previewImport(rows: unknown[]) {
  return rows.map((input, index) => {
    const row = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const errors: string[] = [];
    if (!String(row.name || '').trim()) errors.push('name is required');
    if (row.type && !['lead', 'opportunity'].includes(String(row.type))) errors.push('type must be lead or opportunity');
    if (row.stage_id && !['new', 'qualified', 'proposition', 'won', 'lost'].includes(String(row.stage_id))) errors.push('unknown stage_id');
    for (const field of ['expected_revenue', 'recurring_revenue', 'probability', 'priority']) if (row[field] !== undefined && row[field] !== '' && !Number.isFinite(Number(row[field]))) errors.push(`${field} must be numeric`);
    if (row.expected_closing && !/^\d{4}-\d{2}-\d{2}$/.test(String(row.expected_closing))) errors.push('expected_closing must use YYYY-MM-DD');
    return { row: index + 1, values: Object.fromEntries(importFields.map(field => [field, row[field] ?? ''])), errors };
  });
}

export async function recordImportErrors(preview: Array<{ row: number; values: Record<string, unknown>; errors: string[] }>) {
  const invalid = preview.filter(item => item.errors.length);
  if (!invalid.length) return;
  await withDb(connection => run(connection, 'INSERT INTO crm_import_history(id, imported_count, error_count, errors) VALUES(?,?,?,?)', [
    `import-${crypto.randomUUID().slice(0, 8)}`, 0, invalid.length, JSON.stringify(invalid),
  ]));
}

export async function previewImportWithHistory(rows: unknown[]) {
  const preview = await previewImport(rows);
  await recordImportErrors(preview);
  return preview;
}

export async function commitImport(rows: unknown[]) {
  const preview = await previewImport(rows);
  const invalid = preview.filter(item => item.errors.length);
  if (invalid.length) {
    await recordImportErrors(preview);
    throw Object.assign(new Error('Import contains invalid rows'), { status: 400, details: invalid });
  }
  return withDb(async connection => {
    await run(connection, 'BEGIN TRANSACTION');
    try {
      for (const item of preview) {
        const values = item.values;
        await run(connection, `
          INSERT INTO crm_lead(id, name, type, stage_id, partner_name, contact_name, email, phone, team, salesperson, source, campaign, expected_revenue, recurring_revenue, recurring_plan_id, probability, expected_closing, priority, tags, next_activity, notes)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `, [`${String(values.type || 'opportunity') === 'lead' ? 'lead' : 'opp'}-${crypto.randomUUID().slice(0, 8)}`, String(values.name), String(values.type || 'opportunity'), String(values.stage_id || 'new'), String(values.partner_name || ''), String(values.contact_name || ''), String(values.email || ''), String(values.phone || ''), String(values.team || ''), String(values.salesperson || 'Mitchell Admin'), String(values.source || ''), String(values.campaign || ''), Number(values.expected_revenue || 0), Number(values.recurring_revenue || 0), String(values.recurring_plan_id || ''), Number(values.probability || 0), String(values.expected_closing || '') || null, Number(values.priority || 0), String(values.tags || ''), String(values.next_activity || ''), String(values.notes || '')]);
      }
      await run(connection, `UPDATE crm_lead l SET partner_id = p.id FROM crm_partner p WHERE l.partner_id IS NULL AND l.partner_name <> '' AND lower(l.partner_name) = lower(p.name)`);
      await run(connection, `UPDATE crm_lead l SET team_id = t.id FROM crm_team t WHERE l.team_id IS NULL AND l.team <> '' AND lower(l.team) = lower(t.name)`);
      await run(connection, `UPDATE crm_lead l SET salesperson_id = u.id FROM res_user u WHERE l.salesperson_id IS NULL AND l.salesperson <> '' AND lower(l.salesperson) = lower(u.name)`);
      await run(connection, `INSERT INTO crm_lead_tag(lead_id, tag_id)
        SELECT l.id, t.id FROM crm_lead l CROSS JOIN UNNEST(string_split(coalesce(l.tags, ''), ',')) raw(tag_name)
        JOIN crm_tag t ON lower(trim(raw.tag_name)) = lower(t.name) ON CONFLICT DO NOTHING`);
      await run(connection, 'INSERT INTO crm_import_history(id, imported_count, error_count, errors) VALUES(?,?,?,?)', [`import-${crypto.randomUUID().slice(0, 8)}`, preview.length, 0, '[]']);
      await run(connection, 'COMMIT');
    } catch (error) {
      await run(connection, 'ROLLBACK');
      throw error;
    }
    return { ok: true, imported: preview.length };
  });
}

export async function importHistory() {
  return withDb(connection => all(connection, 'SELECT id, imported_count, error_count, errors, created_at FROM crm_import_history ORDER BY created_at DESC LIMIT 50'));
}

export async function mutateLeads(ids: string[], operation: string, value = '') {
  return withDb(async connection => {
    if (!ids.length) return { ok: true, count: 0 };
    const placeholders = ids.map(() => '?').join(',');
    if (operation === 'archive') await run(connection, `UPDATE crm_lead SET active = false WHERE id IN (${placeholders})`, ids);
    else if (operation === 'restore') await run(connection, `UPDATE crm_lead SET active = true WHERE id IN (${placeholders})`, ids);
    else if (operation === 'delete') {
      await run(connection, `DELETE FROM crm_activity WHERE lead_id IN (${placeholders})`, ids);
      await run(connection, `DELETE FROM crm_message WHERE lead_id IN (${placeholders})`, ids);
      await run(connection, `DELETE FROM crm_follower WHERE lead_id IN (${placeholders})`, ids);
      await run(connection, `DELETE FROM crm_attachment WHERE lead_id IN (${placeholders})`, ids);
      await run(connection, `DELETE FROM crm_lead WHERE id IN (${placeholders})`, ids);
    } else if (operation === 'assign') await run(connection, `UPDATE crm_lead SET salesperson = ? WHERE id IN (${placeholders})`, [value || 'Mitchell Admin', ...ids]);
    else if (operation === 'stage') await run(connection, `UPDATE crm_lead SET stage_id = ? WHERE id IN (${placeholders})`, [value, ...ids]);
    else if (operation === 'merge' && ids.length > 1) return mergeLeads(ids);
    else return { ok: false, error: 'Unknown lead operation' };
    return { ok: true, count: ids.length };
  });
}

export async function listLeads(search = '', options: { type?: string; filter?: string; sort?: string; groupBy?: string; teamId?: string; role?: AccessRole } = {}) {
  return withDb(async connection => {
    const conditions = [options.filter === 'archived' ? 'NOT l.active' : 'l.active'];
    const params: any[] = [];
    applyOwnershipScope(conditions, options.role);
    if (options.type === 'lead' || options.type === 'opportunity') {
      const compiled = compileDomain([['type', '=', options.type]], { type: 'l.type' });
      conditions.push(compiled.sql);
      params.push(...compiled.params);
    }
    if (options.teamId) {
      conditions.push('(l.team_id = ? OR (l.team_id IS NULL AND lower(l.team) = lower((SELECT name FROM crm_team WHERE id = ?))))');
      params.push(options.teamId, options.teamId);
    }
    if (options.filter === 'assigned_to_me') conditions.push("l.salesperson = 'Mitchell Admin'");
    if (options.filter === 'unassigned') conditions.push("coalesce(l.salesperson, '') = ''");
    if (options.filter === 'open') conditions.push("s.id NOT IN ('won', 'lost')");
    if (options.filter === 'won') conditions.push("s.id = 'won'");
    if (options.filter === 'lost') conditions.push("s.id = 'lost'");
    if (options.filter === 'overdue') conditions.push('l.expected_closing < current_date');
    if (options.filter === 'activity_status') conditions.push('EXISTS (SELECT 1 FROM crm_activity a WHERE a.lead_id = l.id AND NOT a.done)');
    if (search.trim()) {
      const terms = search.trim().split(/\s+/).filter(Boolean);
      for (const term of terms) {
        const alternatives = term.split('|').filter(Boolean);
        const clauses: string[] = [];
        for (const alternative of alternatives) {
          clauses.push("(lower(l.name) LIKE lower(?) OR lower(coalesce(l.partner_name, '')) LIKE lower(?) OR lower(coalesce(l.salesperson, '')) LIKE lower(?))");
          const value = `%${alternative}%`; params.push(value, value, value);
        }
        conditions.push(`(${clauses.join(' OR ')})`);
      }
    }
    const sortOrder = options.sort === 'revenue' ? 'l.expected_revenue DESC' : options.sort === 'closing' ? 'l.expected_closing NULLS LAST' : 'l.created_at DESC';
    const groupOrder = options.groupBy === 'stage_id' ? 's.sequence' : options.groupBy === 'salesperson' ? 'l.salesperson NULLS FIRST' : options.groupBy === 'team' ? 'l.team NULLS FIRST' : options.groupBy === 'partner_name' ? 'l.partner_name NULLS FIRST' : options.groupBy === 'expected_closing' ? 'date_trunc(\'month\', l.expected_closing) NULLS LAST' : '';
    const order = groupOrder ? `${groupOrder}, ${sortOrder}` : sortOrder;
    return all(connection, `
    SELECT l.*, s.name AS stage_name
    FROM crm_lead l JOIN crm_stage s ON s.id = l.stage_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${order}
  `, params);
  });
}

export async function getLead(id: string) {
  return withDb(async connection => {
    const rows = await all(connection, 'SELECT * FROM crm_lead WHERE id = ?', [id]);
    const row = rows[0];
    if (!row) return null;
    const relation = await all(connection, `
      SELECT coalesce(string_agg(tag.id, ',' ORDER BY tag.id), '') AS tag_ids
      FROM crm_lead l
      LEFT JOIN crm_lead_tag lt ON lt.lead_id = l.id
      LEFT JOIN crm_tag tag ON tag.id = lt.tag_id
      WHERE l.id = ?
    `, [id]);
    if (relation[0]) {
      row.tag_ids = relation[0].tag_ids || '';
    }
    return row;
  });
}

export async function canAccessLead(id: string, role: AccessRole) {
  if (role !== 'salesperson') return true;
  return withDb(async connection => Boolean((await all(connection, "SELECT id FROM crm_lead WHERE id = ? AND (salesperson = 'Mitchell Admin' OR coalesce(salesperson, '') = '')", [id]))[0]));
}

export async function canAccessLeads(ids: string[], role: AccessRole) {
  if (role !== 'salesperson' || !ids.length) return true;
  return withDb(async connection => {
    const placeholders = ids.map(() => '?').join(',');
    const rows = await all(connection, `SELECT count(*) AS count FROM crm_lead WHERE id IN (${placeholders}) AND (salesperson = 'Mitchell Admin' OR coalesce(salesperson, '') = '')`, ids);
    return Number(rows[0]?.count || 0) === ids.length;
  });
}

export async function canAccessActivities(ids: string[], role: AccessRole) {
  if (role !== 'salesperson' || !ids.length) return true;
  return withDb(async connection => {
    const placeholders = ids.map(() => '?').join(',');
    const rows = await all(connection, `
      SELECT count(*) AS count
      FROM crm_activity a JOIN crm_lead l ON l.id = a.lead_id
      WHERE a.id IN (${placeholders}) AND (l.salesperson = 'Mitchell Admin' OR coalesce(l.salesperson, '') = '')
    `, ids);
    return Number(rows[0]?.count || 0) === ids.length;
  });
}

export async function partners(search = '') {
  const term = `%${search.trim()}%`;
  return withDb(connection => all(connection, 'SELECT id, name, email, phone FROM crm_partner WHERE lower(name) LIKE lower(?) ORDER BY name LIMIT 20', [term]));
}

export async function crmLookups(search = '') {
  const term = `%${search.trim()}%`;
  return withDb(async connection => ({
    partners: await all(connection, 'SELECT id, name, email, phone FROM crm_partner WHERE lower(name) LIKE lower(?) ORDER BY name LIMIT 20', [term]),
    users: await all(connection, 'SELECT id, name, email FROM res_user WHERE active AND lower(name) LIKE lower(?) ORDER BY name', [term]),
    teams: await all(connection, 'SELECT id, name FROM crm_team WHERE active AND lower(name) LIKE lower(?) ORDER BY name', [term]),
    tags: await all(connection, 'SELECT id, name, color FROM crm_tag ORDER BY name'),
    recurringPlans: await all(connection, 'SELECT id, name FROM crm_recurring_plan WHERE active ORDER BY name'),
  }));
}

export async function listCustomers(search = '') {
  return withDb(connection => all(connection, `
    SELECT p.id, p.name, p.email, p.phone,
      count(l.id) AS opportunity_count,
      coalesce(sum(l.expected_revenue), 0) AS expected_revenue
    FROM crm_partner p
    LEFT JOIN crm_lead l ON l.partner_name = p.name AND l.active
    WHERE lower(p.name) LIKE lower(?) OR lower(coalesce(p.email, '')) LIKE lower(?)
    GROUP BY p.id, p.name, p.email, p.phone
    ORDER BY p.name
  `, [`%${search.trim()}%`, `%${search.trim()}%`])) ;
}

export async function listTeams() {
  return withDb(connection => all(connection, `
    SELECT t.id, t.name, t.quota,
      (SELECT count(*) FROM crm_lead l WHERE l.active AND (l.team_id = t.id OR (l.team_id IS NULL AND l.team = t.name))) AS lead_count,
      (SELECT coalesce(sum(l.expected_revenue), 0) FROM crm_lead l WHERE l.active AND (l.team_id = t.id OR (l.team_id IS NULL AND l.team = t.name))) AS expected_revenue,
      (SELECT count(*) FROM crm_lead l WHERE l.active AND l.stage_id NOT IN ('won', 'lost') AND (l.team_id = t.id OR (l.team_id IS NULL AND l.team = t.name))) AS open_count,
      (SELECT count(*) FROM crm_team_member m WHERE m.team_id = t.id) AS member_count
    FROM crm_team t WHERE t.active ORDER BY t.name
  `));
}

export async function saveCustomer(values: Record<string, unknown>) {
  return withDb(async connection => {
    const id = String(values.id || `partner-${crypto.randomUUID().slice(0, 8)}`);
    const name = String(values.name || '').trim();
    if (!name) throw Object.assign(new Error('Customer name is required'), { status: 400 });
    await run(connection, 'INSERT INTO crm_partner(id, name, email, phone) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email, phone=excluded.phone', [id, name, String(values.email || ''), String(values.phone || '')]);
    return (await all(connection, 'SELECT id, name, email, phone FROM crm_partner WHERE id = ?', [id]))[0];
  });
}

export async function getCustomer(id: string) {
  return withDb(async connection => (await all(connection, 'SELECT id, name, email, phone FROM crm_partner WHERE id = ?', [id]))[0] || null);
}

export async function customerRelated(id: string) {
  return withDb(async connection => {
    const partner = (await all(connection, 'SELECT name FROM crm_partner WHERE id = ?', [id]))[0];
    if (!partner) return { leads: [], activities: [] };
    const leads = await all(connection, `SELECT l.id, l.name, l.type, l.stage_id, s.name AS stage_name, l.expected_revenue FROM crm_lead l JOIN crm_stage s ON s.id = l.stage_id WHERE l.active AND (l.partner_id = ? OR (l.partner_id IS NULL AND l.partner_name = ?)) ORDER BY l.created_at DESC`, [id, partner.name]);
    const activities = await all(connection, `SELECT a.id, a.lead_id, a.summary, a.activity_type, a.due_date, a.done FROM crm_activity a JOIN crm_lead l ON l.id = a.lead_id WHERE l.active AND (l.partner_id = ? OR (l.partner_id IS NULL AND l.partner_name = ?)) ORDER BY a.due_date NULLS LAST`, [id, partner.name]);
    return { leads, activities };
  });
}

export async function saveTeam(values: Record<string, unknown>) {
  return withDb(async connection => {
    const id = String(values.id || `team-${crypto.randomUUID().slice(0, 8)}`);
    const name = String(values.name || '').trim();
    if (!name) throw Object.assign(new Error('Sales team name is required'), { status: 400 });
    await run(connection, 'INSERT INTO crm_team(id, name, quota, active) VALUES(?,?,?,true) ON CONFLICT(id) DO UPDATE SET name=excluded.name, quota=excluded.quota, active=true', [id, name, Number(values.quota || 0)]);
    await run(connection, 'DELETE FROM crm_team_member WHERE team_id = ?', [id]);
    const memberIds = Array.isArray(values.member_ids) ? values.member_ids.map(value => String(value)) : String(values.member_ids || '').split(',');
    for (const userId of memberIds.map(value => value.trim()).filter(Boolean)) await run(connection, 'INSERT INTO crm_team_member(team_id, user_id) VALUES(?,?) ON CONFLICT DO NOTHING', [id, userId]);
    return getTeam(id);
  });
}

export async function getTeam(id: string) {
  return withDb(async connection => {
    const row = (await all(connection, 'SELECT id, name, quota, active FROM crm_team WHERE id = ?', [id]))[0];
    if (!row) return null;
    row.member_ids = (await all(connection, 'SELECT user_id FROM crm_team_member WHERE team_id = ? ORDER BY user_id', [id])).map(member => member.user_id).join(',');
    return row;
  });
}

export async function reportSummary(role?: AccessRole) {
  return withDb(async connection => {
    const scope = role === 'salesperson' ? " AND (salesperson = 'Mitchell Admin' OR coalesce(salesperson, '') = '')" : '';
    const [summary] = await all(connection, `
      SELECT count(*) AS total,
        count(*) FILTER (WHERE type = 'lead') AS leads,
        count(*) FILTER (WHERE type = 'opportunity') AS opportunities,
        count(*) FILTER (WHERE stage_id = 'won') AS won,
        count(*) FILTER (WHERE stage_id = 'lost') AS lost,
        coalesce(sum(expected_revenue) FILTER (WHERE stage_id NOT IN ('won', 'lost')), 0) AS open_revenue,
        coalesce(sum(expected_revenue) FILTER (WHERE stage_id = 'won'), 0) AS won_revenue
      FROM crm_lead WHERE active${scope}
    `);
    const byStage = await all(connection, `
      SELECT s.name AS label, count(l.id) AS count, coalesce(sum(l.expected_revenue), 0) AS revenue
      FROM crm_stage s LEFT JOIN crm_lead l ON l.stage_id = s.id AND l.active
      ${role === 'salesperson' ? "AND (l.salesperson = 'Mitchell Admin' OR coalesce(l.salesperson, '') = '')" : ''}
      GROUP BY s.sequence, s.name ORDER BY s.sequence
    `);
    return { summary, byStage };
  });
}

export async function reportAnalysis(dimension = 'stage', role?: AccessRole, fromDate = '', toDate = '', search = '') {
  const dimensions: Record<string, string> = {
    stage: 's.name', salesperson: "coalesce(l.salesperson, 'Unassigned')", team: "coalesce(l.team, 'Unassigned')", customer: "coalesce(l.partner_name, 'Unassigned')",
    closing_bucket: "CASE WHEN l.expected_closing IS NULL THEN 'Unscheduled' WHEN l.expected_closing < current_date THEN 'Overdue' ELSE strftime(l.expected_closing, '%Y-%m') END",
  };
  const expression = dimensions[dimension] || dimensions.stage;
  return withDb(connection => {
    const conditions = ['l.active', "l.type = 'opportunity'"];
    const params: string[] = [];
    if (role === 'salesperson') conditions.push("(l.salesperson = 'Mitchell Admin' OR coalesce(l.salesperson, '') = '')");
    if (fromDate) { conditions.push('cast(l.created_at AS DATE) >= ?'); params.push(fromDate); }
    if (toDate) { conditions.push('cast(l.created_at AS DATE) <= ?'); params.push(toDate); }
    if (search.trim()) { conditions.push(`lower(cast(${expression} AS VARCHAR)) LIKE lower(?)`); params.push(`%${search.trim()}%`); }
    return all(connection, `
    SELECT ${expression} AS label, count(l.id) AS count,
      coalesce(sum(l.expected_revenue), 0) AS revenue,
      coalesce(sum(l.recurring_revenue), 0) AS recurring_revenue,
      coalesce(sum(l.expected_revenue * l.probability / 100), 0) AS weighted_revenue,
      coalesce(avg(l.probability), 0) AS avg_probability
    FROM crm_lead l JOIN crm_stage s ON s.id = l.stage_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY ${expression} ORDER BY revenue DESC
  `, params);
  });
}

export async function reportDrilldown(dimension = 'stage', value = '', role?: AccessRole, secondaryDimension = '', secondaryValue = '') {
  const dimensions: Record<string, string> = {
    stage: 's.name', salesperson: "coalesce(l.salesperson, 'Unassigned')", team: "coalesce(l.team, 'Unassigned')", customer: "coalesce(l.partner_name, 'Unassigned')",
    closing_bucket: "CASE WHEN l.expected_closing IS NULL THEN 'Unscheduled' WHEN l.expected_closing < current_date THEN 'Overdue' ELSE strftime(l.expected_closing, '%Y-%m') END",
  };
  const expression = dimensions[dimension] || dimensions.stage;
  return withDb(connection => {
    const conditions = ['l.active', "l.type = 'opportunity'", `${expression} = ?`];
    const params: string[] = [value];
    if (secondaryDimension && dimensions[secondaryDimension]) { conditions.push(`${dimensions[secondaryDimension]} = ?`); params.push(secondaryValue); }
    if (role === 'salesperson') conditions.push("(l.salesperson = 'Mitchell Admin' OR coalesce(l.salesperson, '') = '')");
    return all(connection, `
    SELECT l.*, s.name AS stage_name
    FROM crm_lead l JOIN crm_stage s ON s.id = l.stage_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY l.expected_revenue DESC, l.created_at DESC
  `, params);
  });
}

export async function leadAnalysis(dimension = 'source', role?: AccessRole, search = '') {
  const dimensions: Record<string, string> = {
    source: "coalesce(l.source, 'Unspecified')", campaign: "coalesce(l.campaign, 'Unspecified')", team: "coalesce(l.team, 'Unassigned')", salesperson: "coalesce(l.salesperson, 'Unassigned')", stage: 's.name',
  };
  const expression = dimensions[dimension] || dimensions.source;
  return withDb(connection => {
    const params: string[] = [];
    const searchClause = search.trim() ? ` AND (lower(l.name) LIKE lower(?) OR lower(coalesce(l.partner_name, '')) LIKE lower(?) OR lower(coalesce(l.source, '')) LIKE lower(?) OR lower(coalesce(l.campaign, '')) LIKE lower(?) OR lower(coalesce(l.salesperson, '')) LIKE lower(?))` : '';
    if (searchClause) { const value = `%${search.trim()}%`; params.push(value, value, value, value, value); }
    return all(connection, `
    SELECT ${expression} AS label, count(l.id) AS created_count,
      count(l.id) FILTER (WHERE l.converted_at IS NOT NULL) AS converted_count,
      coalesce(sum(l.expected_revenue), 0) AS revenue
    FROM crm_lead l JOIN crm_stage s ON s.id = l.stage_id
    WHERE l.active${role === 'salesperson' ? " AND (l.salesperson = 'Mitchell Admin' OR coalesce(l.salesperson, '') = '')" : ''}${searchClause}
    GROUP BY ${expression} ORDER BY created_count DESC, label
  `, params);
  });
}

export async function leadDrilldown(dimension = 'source', value = '', role?: AccessRole) {
  const dimensions: Record<string, string> = {
    source: "coalesce(l.source, 'Unspecified')", campaign: "coalesce(l.campaign, 'Unspecified')", team: "coalesce(l.team, 'Unassigned')", salesperson: "coalesce(l.salesperson, 'Unassigned')", stage: 's.name',
  };
  const expression = dimensions[dimension] || dimensions.source;
  return withDb(connection => all(connection, `
    SELECT l.*, s.name AS stage_name
    FROM crm_lead l JOIN crm_stage s ON s.id = l.stage_id
    WHERE l.active AND ${expression} = ?${role === 'salesperson' ? " AND (l.salesperson = 'Mitchell Admin' OR coalesce(l.salesperson, '') = '')" : ''}
    ORDER BY l.created_at DESC
  `, [value]));
}

export async function listActivities(options: { search?: string; status?: string; role?: AccessRole } = {}) {
  return withDb(async connection => {
    const conditions = ['1 = 1'];
    const params: any[] = [];
    if (options.status === 'open') conditions.push('NOT a.done');
    if (options.status === 'done') conditions.push('a.done');
    if (options.status === 'overdue') conditions.push('NOT a.done AND a.due_date < current_date');
    applyOwnershipScope(conditions, options.role, 'l');
    if (options.search?.trim()) {
      conditions.push('(lower(a.summary) LIKE lower(?) OR lower(l.name) LIKE lower(?) OR lower(coalesce(l.salesperson, \'\')) LIKE lower(?))');
      const value = `%${options.search.trim()}%`;
      params.push(value, value, value);
    }
    return all(connection, `
      SELECT a.id, a.lead_id, a.activity_type, a.summary, a.due_date, a.done,
             l.name AS lead_name, l.type AS lead_type, l.salesperson
      FROM crm_activity a JOIN crm_lead l ON l.id = a.lead_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.done, a.due_date NULLS LAST, a.id DESC
    `, params);
  });
}

export async function activityAnalysis(dimension = 'activity_type', role?: AccessRole, search = '') {
  const dimensions: Record<string, string> = {
    activity_type: 'a.activity_type', salesperson: "coalesce(l.salesperson, 'Unassigned')", due_date: "coalesce(cast(a.due_date AS VARCHAR), 'No due date')",
  };
  const expression = dimensions[dimension] || dimensions.activity_type;
  return withDb(connection => {
    const params: string[] = [];
    const searchClause = search.trim() ? ` AND (lower(a.summary) LIKE lower(?) OR lower(l.name) LIKE lower(?) OR lower(coalesce(a.activity_type, '')) LIKE lower(?) OR lower(coalesce(l.salesperson, '')) LIKE lower(?))` : '';
    if (searchClause) { const value = `%${search.trim()}%`; params.push(value, value, value, value); }
    return all(connection, `
    SELECT ${expression} AS label, count(a.id) AS scheduled,
      count(a.id) FILTER (WHERE a.done) AS completed,
      count(a.id) FILTER (WHERE NOT a.done AND a.due_date < current_date) AS overdue
    FROM crm_activity a JOIN crm_lead l ON l.id = a.lead_id
    WHERE l.active${role === 'salesperson' ? " AND (l.salesperson = 'Mitchell Admin' OR coalesce(l.salesperson, '') = '')" : ''}${searchClause}
    GROUP BY ${expression} ORDER BY scheduled DESC, label
  `, params);
  });
}

export async function activityDrilldown(dimension = 'activity_type', value = '', role?: AccessRole) {
  const dimensions: Record<string, string> = {
    activity_type: 'a.activity_type', salesperson: "coalesce(l.salesperson, 'Unassigned')", due_date: "coalesce(cast(a.due_date AS VARCHAR), 'No due date')",
  };
  const expression = dimensions[dimension] || dimensions.activity_type;
  return withDb(connection => all(connection, `
    SELECT a.id, a.lead_id, a.activity_type, a.summary, a.due_date, a.done, l.name AS lead_name, l.salesperson
    FROM crm_activity a JOIN crm_lead l ON l.id = a.lead_id
    WHERE l.active AND ${expression} = ?${role === 'salesperson' ? " AND (l.salesperson = 'Mitchell Admin' OR coalesce(l.salesperson, '') = '')" : ''}
    ORDER BY a.done, a.due_date NULLS LAST, a.id
  `, [value]));
}

export async function mutateActivities(ids: string[], operation: string, value = '') {
  return withDb(async connection => {
    if (!ids.length) return { ok: true, count: 0 };
    const placeholders = ids.map(() => '?').join(',');
    if (operation === 'done') await run(connection, `UPDATE crm_activity SET done = true WHERE id IN (${placeholders})`, ids);
    else if (operation === 'reopen') await run(connection, `UPDATE crm_activity SET done = false WHERE id IN (${placeholders})`, ids);
    else if (operation === 'reschedule' && value) await run(connection, `UPDATE crm_activity SET due_date = ? WHERE id IN (${placeholders})`, [value, ...ids]);
    else return { ok: false, error: 'Unknown activity operation' };
    return { ok: true, count: ids.length };
  });
}

export async function leadExtras(id: string) {
  return withDb(async connection => ({
    messages: await all(connection, 'SELECT id, author, body, created_at FROM crm_message WHERE lead_id = ? ORDER BY created_at DESC', [id]),
    activities: await all(connection, 'SELECT id, activity_type, summary, due_date, done FROM crm_activity WHERE lead_id = ? ORDER BY due_date NULLS LAST', [id]),
    followers: await all(connection, 'SELECT id, name FROM crm_follower WHERE lead_id = ? ORDER BY name', [id]),
    attachments: await all(connection, 'SELECT id, name, stored_path, mime_type, file_size, created_at FROM crm_attachment WHERE lead_id = ? ORDER BY created_at DESC', [id]),
  }));
}

export async function addMessage(leadId: string, body: string) {
  return withDb(async connection => {
    if (!body.trim()) throw Object.assign(new Error('Message body is required'), { status: 400 });
    await run(connection, 'INSERT INTO crm_message(id, lead_id, author, body) VALUES(?,?,?,?)', [`message-${crypto.randomUUID().slice(0, 8)}`, leadId, 'Mitchell Admin', body.trim()]);
    return leadExtras(leadId);
  });
}

export async function addActivity(leadId: string, activityType: string, summary: string, dueDate: string) {
  return withDb(async connection => {
    if (!summary.trim()) throw Object.assign(new Error('Activity summary is required'), { status: 400 });
    await run(connection, 'INSERT INTO crm_activity(id, lead_id, activity_type, summary, due_date) VALUES(?,?,?,?,?)', [`activity-${crypto.randomUUID().slice(0, 8)}`, leadId, activityType, summary.trim(), dueDate || null]);
    return leadExtras(leadId);
  });
}

export async function addFollower(leadId: string, name: string) {
  return withDb(async connection => {
    if (!name.trim()) throw Object.assign(new Error('Follower name is required'), { status: 400 });
    await run(connection, 'INSERT INTO crm_follower(id, lead_id, name) VALUES(?,?,?)', [`follower-${crypto.randomUUID().slice(0, 8)}`, leadId, name.trim()]);
    return leadExtras(leadId);
  });
}

export async function addAttachment(leadId: string, name: string) {
  return withDb(async connection => {
    if (!name.trim()) throw Object.assign(new Error('Attachment name is required'), { status: 400 });
    await run(connection, 'INSERT INTO crm_attachment(id, lead_id, name) VALUES(?,?,?)', [`attachment-${crypto.randomUUID().slice(0, 8)}`, leadId, name.trim()]);
    return leadExtras(leadId);
  });
}

export async function addAttachmentFile(leadId: string, file: File) {
  return withDb(async connection => {
    if (!file.name || !file.size) throw Object.assign(new Error('Attachment file is required'), { status: 400 });
    const id = `attachment-${crypto.randomUUID().slice(0, 8)}`;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedPath = `${id}-${safeName}`;
    const uploadDir = join(import.meta.dir, 'uploads');
    await mkdir(uploadDir, { recursive: true });
    await Bun.write(join(uploadDir, storedPath), file);
    await run(connection, 'INSERT INTO crm_attachment(id, lead_id, name, stored_path, mime_type, file_size) VALUES(?,?,?,?,?,?)', [id, leadId, file.name, storedPath, file.type || 'application/octet-stream', file.size]);
    return leadExtras(leadId);
  });
}

export async function attachmentFile(id: string) {
  return withDb(async connection => (await all(connection, 'SELECT id, lead_id, name, stored_path, mime_type, file_size FROM crm_attachment WHERE id = ?', [id]))[0] || null);
}

export async function saveLead(values: Record<string, unknown>) {
  return withDb(async connection => {
    const id = String(values.id || `opp-${crypto.randomUUID().slice(0, 8)}`);
    const name = String(values.name || '').trim();
    if (!name) throw Object.assign(new Error('Opportunity name is required'), { status: 400 });
    const existing = id && values.id ? (await all(connection, 'SELECT write_version FROM crm_lead WHERE id = ?', [id]))[0] : null;
    if (existing && values.write_version != null && Number(values.write_version) !== Number(existing.write_version || 1)) {
      throw Object.assign(new Error('This record was changed by another user. Reload before saving.'), { status: 409 });
    }
    const params = [
      id, name, String(values.type || 'opportunity'), String(values.stage_id || 'new'),
      String(values.partner_name || ''), String(values.contact_name || ''), String(values.email || ''), String(values.phone || ''), String(values.source || ''), String(values.campaign || ''), String(values.team || 'North America'),
      String(values.salesperson || 'Mitchell Admin'), Number(values.expected_revenue || 0), Number(values.recurring_revenue || 0), String(values.recurring_plan_id || ''), Number(values.priority || 0), String(values.tags || ''),
      Number(values.probability || 0), String(values.expected_closing || '') || null, String(values.next_activity || ''), String(values.notes || ''),
    ];
    await run(connection, `
      INSERT INTO crm_lead(id, name, type, stage_id, partner_name, contact_name, email, phone, source, campaign, team, salesperson, expected_revenue, recurring_revenue, recurring_plan_id, priority, tags, probability, expected_closing, next_activity, notes)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, type=excluded.type, stage_id=excluded.stage_id,
        partner_name=excluded.partner_name, salesperson=excluded.salesperson, source=excluded.source, campaign=excluded.campaign,
        expected_revenue=excluded.expected_revenue, recurring_revenue=excluded.recurring_revenue, recurring_plan_id=excluded.recurring_plan_id, priority=excluded.priority,
        tags=excluded.tags, contact_name=excluded.contact_name, email=excluded.email,
        phone=excluded.phone, team=excluded.team, probability=excluded.probability,
        expected_closing=excluded.expected_closing, next_activity=excluded.next_activity,
        notes=excluded.notes, write_version=coalesce(crm_lead.write_version, 1) + 1
    `, params);
    const partner = (await all(connection, 'SELECT id, name FROM crm_partner WHERE id = ? OR lower(name) = lower(?) LIMIT 1', [String(values.partner_id || ''), String(values.partner_name || '')]))[0];
    const team = (await all(connection, 'SELECT id, name FROM crm_team WHERE id = ? OR lower(name) = lower(?) LIMIT 1', [String(values.team_id || ''), String(values.team || '')]))[0];
    const user = (await all(connection, 'SELECT id, name FROM res_user WHERE id = ? OR lower(name) = lower(?) LIMIT 1', [String(values.salesperson_id || ''), String(values.salesperson || '')]))[0];
    await run(connection, 'UPDATE crm_lead SET partner_name = ?, team = ?, salesperson = ? WHERE id = ?', [partner?.name || String(values.partner_name || ''), team?.name || String(values.team || ''), user?.name || String(values.salesperson || ''), id]);
    await run(connection, 'UPDATE crm_lead SET partner_id = ?, team_id = ?, salesperson_id = ? WHERE id = ?', [partner?.id || null, team?.id || null, user?.id || null, id]);
    await run(connection, 'DELETE FROM crm_lead_tag WHERE lead_id = ?', [id]);
    const tagValues = String(values.tags ?? values.tag_ids ?? '').split(',').map(value => value.trim()).filter(Boolean);
    await run(connection, 'UPDATE crm_lead SET tags = ? WHERE id = ?', [tagValues.join(','), id]);
    for (const tag of tagValues) {
      const tagRow = (await all(connection, 'SELECT id FROM crm_tag WHERE lower(name) = lower(?) OR id = ? LIMIT 1', [tag, tag]))[0];
      if (tagRow) await run(connection, 'INSERT INTO crm_lead_tag(lead_id, tag_id) VALUES(?, ?) ON CONFLICT DO NOTHING', [id, tagRow.id]);
    }
    return getLead(id);
  });
}
