import duckdb from 'duckdb';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
    for (const file of ['schema.sql', 'seed.sql']) {
      for (const statement of readFileSync(join(import.meta.dir, file), 'utf8').split(';').map(sql => sql.trim()).filter(Boolean)) {
        await run(connection, statement);
      }
    }
    for (const column of [
      'contact_name VARCHAR', 'email VARCHAR', 'phone VARCHAR', 'team VARCHAR',
      'probability DOUBLE DEFAULT 0', 'expected_closing DATE', 'notes VARCHAR',
    ]) await run(connection, `ALTER TABLE crm_lead ADD COLUMN IF NOT EXISTS ${column}`);
  });
}

export async function pipeline(search = '', options: { filter?: string; sort?: string } = {}) {
  return withDb(async connection => {
    const rows = await listLeads(search, { type: 'opportunity', filter: options.filter, sort: options.sort });
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
    await run(connection, 'UPDATE crm_lead SET stage_id = ? WHERE id = ?', [stageId, id]);
  });
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
    else if (operation === 'merge' && ids.length > 1) {
      const [primary, ...duplicates] = ids;
      await run(connection, `DELETE FROM crm_activity WHERE lead_id IN (${duplicates.map(() => '?').join(',')})`, duplicates);
      await run(connection, `DELETE FROM crm_message WHERE lead_id IN (${duplicates.map(() => '?').join(',')})`, duplicates);
      await run(connection, `DELETE FROM crm_follower WHERE lead_id IN (${duplicates.map(() => '?').join(',')})`, duplicates);
      await run(connection, `DELETE FROM crm_attachment WHERE lead_id IN (${duplicates.map(() => '?').join(',')})`, duplicates);
      await run(connection, `DELETE FROM crm_lead WHERE id IN (${duplicates.map(() => '?').join(',')})`, duplicates);
      return { ok: true, count: duplicates.length, merged_into: primary };
    }
    else return { ok: false, error: 'Unknown lead operation' };
    return { ok: true, count: ids.length };
  });
}

export async function listLeads(search = '', options: { type?: string; filter?: string; sort?: string; groupBy?: string } = {}) {
  return withDb(async connection => {
    const conditions = ['l.active'];
    const params: any[] = [];
    if (options.type === 'lead' || options.type === 'opportunity') { conditions.push('l.type = ?'); params.push(options.type); }
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
    return rows[0] || null;
  });
}

export async function partners(search = '') {
  const term = `%${search.trim()}%`;
  return withDb(connection => all(connection, 'SELECT id, name, email, phone FROM crm_partner WHERE lower(name) LIKE lower(?) ORDER BY name LIMIT 20', [term]));
}

export async function leadExtras(id: string) {
  return withDb(async connection => ({
    messages: await all(connection, 'SELECT id, author, body, created_at FROM crm_message WHERE lead_id = ? ORDER BY created_at DESC', [id]),
    activities: await all(connection, 'SELECT id, activity_type, summary, due_date, done FROM crm_activity WHERE lead_id = ? ORDER BY due_date NULLS LAST', [id]),
    followers: await all(connection, 'SELECT id, name FROM crm_follower WHERE lead_id = ? ORDER BY name', [id]),
    attachments: await all(connection, 'SELECT id, name, created_at FROM crm_attachment WHERE lead_id = ? ORDER BY created_at DESC', [id]),
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

export async function saveLead(values: Record<string, unknown>) {
  return withDb(async connection => {
    const id = String(values.id || `opp-${crypto.randomUUID().slice(0, 8)}`);
    const name = String(values.name || '').trim();
    if (!name) throw Object.assign(new Error('Opportunity name is required'), { status: 400 });
    const params = [
      id, name, String(values.type || 'opportunity'), String(values.stage_id || 'new'),
      String(values.partner_name || ''), String(values.contact_name || ''), String(values.email || ''), String(values.phone || ''), String(values.team || 'North America'),
      String(values.salesperson || 'Mitchell Admin'), Number(values.expected_revenue || 0), Number(values.priority || 0), String(values.tags || ''),
      Number(values.probability || 0), String(values.expected_closing || '') || null, String(values.next_activity || ''), String(values.notes || ''),
    ];
    await run(connection, `
      INSERT INTO crm_lead(id, name, type, stage_id, partner_name, contact_name, email, phone, team, salesperson, expected_revenue, priority, tags, probability, expected_closing, next_activity, notes)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, type=excluded.type, stage_id=excluded.stage_id,
        partner_name=excluded.partner_name, salesperson=excluded.salesperson,
        expected_revenue=excluded.expected_revenue, priority=excluded.priority,
        tags=excluded.tags, contact_name=excluded.contact_name, email=excluded.email,
        phone=excluded.phone, team=excluded.team, probability=excluded.probability,
        expected_closing=excluded.expected_closing, next_activity=excluded.next_activity,
        notes=excluded.notes
    `, params);
    return getLead(id);
  });
}
