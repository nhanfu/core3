import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { queryDatasource, runDatasource } from '../db/datasource-runtime.ts';

export { initDatabase } from '../db/database.ts';

type AccessRole = 'salesperson' | 'manager' | 'system';
export const uploadDirectory = join(import.meta.dir, 'uploads');
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export async function pipeline(search = '', options: { filter?: string; sort?: string; role?: AccessRole } = {}) {
  const rows = await listLeads(search, { type: 'opportunity', filter: options.filter, sort: options.sort, role: options.role });
  const stages = await queryDatasource('crm.stages');
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
}

export async function moveStage(id: string, stageId: string) {
  return runDatasource('crm.move_stage', { id, stage_id: stageId });
}

export async function convertLead(id: string, customerName = '') {
  return runDatasource('crm.convert_lead', { id, customer_name: customerName });
}

export async function loseLead(id: string, reasonId: string) {
  return runDatasource('crm.lose_lead', { id, reason_id: reasonId });
}

export async function lostReasons() {
  return queryDatasource('crm.lost_reasons');
}

export async function findDuplicates(id: string) {
  const current = (await queryDatasource('crm.lead_identity', { id }))[0];
  if (!current) return [];
  return queryDatasource('crm.duplicate_leads', {
    id,
    name: current.name,
    partner_name: current.partner_name || '',
    email: current.email || '',
    phone: current.phone || '',
  });
}

export async function mergeLeads(ids: string[]) {
  return runDatasource('crm.merge_leads', { ids });
}

export async function mergePreview(ids: string[]) {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length < 2) return { primary: null, duplicates: [] };
  const rows = await queryDatasource('crm.merge_preview', { ids: unique });
  return { primary: rows[0] || null, duplicates: rows.slice(1) };
}

export async function crmConfig() {
  return queryDatasource('crm.config');
}

export async function crmStages() {
  return queryDatasource('crm.stages');
}

export async function saveCrmStages(rows: unknown[]) {
  for (const input of rows) {
    const row = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    if (!String(row.id || '').trim() || !String(row.name || '').trim()) continue;
    const id = String(row.id).trim();
    const existing = (await queryDatasource('crm.stage_by_id', { id }))[0];
    const sequence = existing ? 0 : Number((await queryDatasource('crm.next_stage_sequence'))[0]?.sequence || 1);
    await runDatasource('crm.save_stage', { id, name: String(row.name), folded: String(row.folded) === 'true', requirements: String(row.requirements || ''), sequence });
  }
  return crmStages();
}

export async function saveLostReason(id: string, name: string) {
  if (!id.trim() || !name.trim()) throw Object.assign(new Error('Lost reason id and name are required'), { status: 400 });
  await runDatasource('crm.save_lost_reason', { id: id.trim(), name: name.trim() });
  return lostReasons();
}

export async function crmTags() {
  return queryDatasource('crm.tags');
}

export async function saveCrmTag(id: string, name: string, color = '') {
  if (!id.trim() || !name.trim()) throw Object.assign(new Error('Tag id and name are required'), { status: 400 });
  await runDatasource('crm.save_tag', { id: id.trim(), name: name.trim(), color: color.trim() });
  return crmTags();
}

const catalogTables = {
  activity_types: 'crm_activity_type',
  activity_plans: 'crm_activity_plan',
  recurring_plans: 'crm_recurring_plan',
} as const;

export async function catalogRows(kind: keyof typeof catalogTables) {
  return queryDatasource(`crm.catalog.${kind}`);
}

export async function saveCatalogRow(kind: keyof typeof catalogTables, values: Record<string, unknown>) {
  const id = String(values.id || '').trim();
  const name = String(values.name || '').trim();
  if (!id || !name) throw Object.assign(new Error('Catalog id and name are required'), { status: 400 });
  if (kind === 'activity_types') await runDatasource('crm.save_activity_type', { id, name, default_summary: String(values.default_summary || '') });
  else if (kind === 'activity_plans') await runDatasource('crm.save_activity_plan', { id, name });
  else await runDatasource('crm.save_recurring_plan', { id, name, interval_number: Number(values.interval_number || 1), interval_unit: String(values.interval_unit || 'month') });
  return catalogRows(kind);
}

export async function saveCrmConfig(values: Record<string, unknown>) {
  for (const [key, value] of Object.entries(values)) {
    if (!['use_leads', 'use_recurring_revenues', 'auto_assign_leads'].includes(key)) continue;
    await runDatasource('crm.save_config', { key, value: String(value) === 'true' ? 'true' : 'false' });
  }
  return crmConfig();
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
  await runDatasource('crm.import_error', {
    id: `import-${crypto.randomUUID().slice(0, 8)}`,
    imported_count: 0,
    error_count: invalid.length,
    errors: JSON.stringify(invalid),
  });
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
  return runDatasource('crm.commit_import', { rows: preview.map(item => item.values) });
}

export async function importHistory() {
  return queryDatasource('crm.import_history');
}

export async function mutateLeads(ids: string[], operation: string, value = '') {
  if (!ids.length) return { ok: true, count: 0 };
  if (operation === 'archive') await runDatasource('crm.mutate.archive', { ids });
  else if (operation === 'restore') await runDatasource('crm.mutate.restore', { ids });
  else if (operation === 'delete') return runDatasource('crm.mutate.delete', { ids });
  else if (operation === 'assign') await runDatasource('crm.mutate.assign', { ids, salesperson: value || 'Mitchell Admin' });
  else if (operation === 'stage') await runDatasource('crm.mutate.stage', { ids, stage_id: value });
  else if (operation === 'merge' && ids.length > 1) return mergeLeads(ids);
  else return { ok: false, error: 'Unknown lead operation' };
  return { ok: true, count: ids.length };
}

export async function listLeads(search = '', options: { type?: string; filter?: string; sort?: string; groupBy?: string; teamId?: string; role?: AccessRole } = {}) {
  return queryDatasource('crm.list_leads', {
    search, type: options.type || '', filter: options.filter || '', sort: options.sort || '', group_by: options.groupBy || '', team_id: options.teamId || '', role: options.role || 'manager',
  });
}

export async function getLead(id: string) {
  const rows = await queryDatasource('crm.lead', { id });
    const row = rows[0];
    if (!row) return null;
    const relation = await queryDatasource('crm.lead_tags', { id });
    if (relation[0]) {
      row.tag_ids = relation[0].tag_ids || '';
    }
    return row;
}

export async function canAccessLead(id: string, role: AccessRole) {
  if (role !== 'salesperson') return true;
  return Boolean((await queryDatasource('crm.lead_access', { id }))[0]);
}

export async function canAccessLeads(ids: string[], role: AccessRole) {
  if (role !== 'salesperson' || !ids.length) return true;
  const rows = await queryDatasource('crm.access.leads', { ids });
  return Number(rows[0]?.count || 0) === ids.length;
}

export async function canAccessActivities(ids: string[], role: AccessRole) {
  if (role !== 'salesperson' || !ids.length) return true;
  const rows = await queryDatasource('crm.access.activities', { ids });
  return Number(rows[0]?.count || 0) === ids.length;
}

export async function partners(search = '') {
  const term = `%${search.trim()}%`;
  return queryDatasource('crm.partners', { search: term });
}

export async function crmLookups(search = '') {
  const term = `%${search.trim()}%`;
  const [partners, users, teams, tags, recurringPlans] = await Promise.all([
    queryDatasource('crm.lookup.partners', { search: term }),
    queryDatasource('crm.lookup.users', { search: term }),
    queryDatasource('crm.lookup.teams', { search: term }),
    queryDatasource('crm.lookup.tags'),
    queryDatasource('crm.lookup.recurring_plans'),
  ]);
  return { partners, users, teams, tags, recurringPlans };
}

export async function listCustomers(search = '') {
  return queryDatasource('crm.customers', { search: `%${search.trim()}%` });
}

export async function listTeams() {
  return queryDatasource('crm.teams');
}

export async function saveCustomer(values: Record<string, unknown>) {
  const id = String(values.id || `partner-${crypto.randomUUID().slice(0, 8)}`);
  const name = String(values.name || '').trim();
  if (!name) throw Object.assign(new Error('Customer name is required'), { status: 400 });
  await runDatasource('crm.save_customer', { id, name, email: String(values.email || ''), phone: String(values.phone || '') });
  return getCustomer(id);
}

export async function getCustomer(id: string) {
  return (await queryDatasource('crm.customer', { id }))[0] || null;
}

export async function customerRelated(id: string) {
  const partner = await getCustomer(id);
  if (!partner) return { leads: [], activities: [] };
  const [leads, activities] = await Promise.all([
    queryDatasource('crm.customer_leads', { id, name: partner.name }),
    queryDatasource('crm.customer_activities', { id, name: partner.name }),
  ]);
  return { leads, activities };
}

export async function saveTeam(values: Record<string, unknown>) {
  const id = String(values.id || `team-${crypto.randomUUID().slice(0, 8)}`);
  const name = String(values.name || '').trim();
  if (!name) throw Object.assign(new Error('Sales team name is required'), { status: 400 });
  await runDatasource('crm.save_team', { id, name, quota: Number(values.quota || 0) });
  await runDatasource('crm.clear_team_members', { id });
  const memberIds = Array.isArray(values.member_ids) ? values.member_ids.map(value => String(value)) : String(values.member_ids || '').split(',');
  for (const userId of memberIds.map(value => value.trim()).filter(Boolean)) await runDatasource('crm.add_team_member', { team_id: id, user_id: userId });
  return getTeam(id);
}

export async function getTeam(id: string) {
  const rows = await queryDatasource('crm.team', { id });
    const row = rows[0];
    if (!row) return null;
    row.member_ids = (await queryDatasource('crm.team_members', { id })).map(member => member.user_id).join(',');
    return row;
}

export async function reportSummary(role?: AccessRole) {
  const [summary, byStage] = await Promise.all([
    queryDatasource('crm.report.summary', { role: role || 'manager' }),
    queryDatasource('crm.report.by_stage', { role: role || 'manager' }),
  ]);
  return { summary, byStage };
}

export async function reportAnalysis(dimension = 'stage', role?: AccessRole, fromDate = '', toDate = '', search = '') {
  const dimensions: Record<string, string> = {
    stage: 's.name', salesperson: "coalesce(l.salesperson, 'Unassigned')", team: "coalesce(l.team, 'Unassigned')", customer: "coalesce(l.partner_name, 'Unassigned')",
    closing_bucket: "CASE WHEN l.expected_closing IS NULL THEN 'Unscheduled' WHEN l.expected_closing < current_date THEN 'Overdue' ELSE strftime(l.expected_closing, '%Y-%m') END",
  };
  const expression = dimensions[dimension] || dimensions.stage;
  return queryDatasource('crm.report.analysis', {
    dimension: 'unused', role: role || 'manager', from_date: fromDate, to_date: toDate, search: search.trim() ? `%${search.trim()}%` : '',
  }, { dimension: expression });
}

export async function reportDrilldown(dimension = 'stage', value = '', role?: AccessRole, secondaryDimension = '', secondaryValue = '') {
  const dimensions: Record<string, string> = {
    stage: 's.name', salesperson: "coalesce(l.salesperson, 'Unassigned')", team: "coalesce(l.team, 'Unassigned')", customer: "coalesce(l.partner_name, 'Unassigned')",
    closing_bucket: "CASE WHEN l.expected_closing IS NULL THEN 'Unscheduled' WHEN l.expected_closing < current_date THEN 'Overdue' ELSE strftime(l.expected_closing, '%Y-%m') END",
  };
  const expression = dimensions[dimension] || dimensions.stage;
  return queryDatasource('crm.report.drilldown', {
    dimension: 'unused', secondary_dimension: 'unused', value, secondary_value: secondaryDimension ? secondaryValue : '', role: role || 'manager',
  }, { dimension: expression, secondary_dimension: dimensions[secondaryDimension] || expression });
}

export async function leadAnalysis(dimension = 'source', role?: AccessRole, search = '') {
  const dimensions: Record<string, string> = {
    source: "coalesce(l.source, 'Unspecified')", campaign: "coalesce(l.campaign, 'Unspecified')", team: "coalesce(l.team, 'Unassigned')", salesperson: "coalesce(l.salesperson, 'Unassigned')", stage: 's.name',
  };
  const expression = dimensions[dimension] || dimensions.source;
  const searchValue = search.trim() ? `%${search.trim()}%` : '';
  return queryDatasource('crm.lead.analysis', { dimension: 'unused', role: role || 'manager', search: searchValue }, { dimension: expression });
}

export async function leadDrilldown(dimension = 'source', value = '', role?: AccessRole) {
  const dimensions: Record<string, string> = {
    source: "coalesce(l.source, 'Unspecified')", campaign: "coalesce(l.campaign, 'Unspecified')", team: "coalesce(l.team, 'Unassigned')", salesperson: "coalesce(l.salesperson, 'Unassigned')", stage: 's.name',
  };
  const expression = dimensions[dimension] || dimensions.source;
  return queryDatasource('crm.lead.drilldown', { dimension: 'unused', value, role: role || 'manager' }, { dimension: expression });
}

export async function listActivities(options: { search?: string; status?: string; role?: AccessRole } = {}) {
  return queryDatasource('crm.activities', {
    status: options.status || '', role: options.role || 'manager', search: options.search?.trim() ? `%${options.search.trim()}%` : '',
  });
}

export async function activityAnalysis(dimension = 'activity_type', role?: AccessRole, search = '') {
  const dimensions: Record<string, string> = {
    activity_type: 'a.activity_type', salesperson: "coalesce(l.salesperson, 'Unassigned')", due_date: "coalesce(cast(a.due_date AS VARCHAR), 'No due date')",
  };
  const expression = dimensions[dimension] || dimensions.activity_type;
  return queryDatasource('crm.activity.analysis', { dimension: 'unused', role: role || 'manager', search: search.trim() ? `%${search.trim()}%` : '' }, { dimension: expression });
}

export async function activityDrilldown(dimension = 'activity_type', value = '', role?: AccessRole) {
  const dimensions: Record<string, string> = {
    activity_type: 'a.activity_type', salesperson: "coalesce(l.salesperson, 'Unassigned')", due_date: "coalesce(cast(a.due_date AS VARCHAR), 'No due date')",
  };
  const expression = dimensions[dimension] || dimensions.activity_type;
  return queryDatasource('crm.activity.drilldown', { dimension: 'unused', value, role: role || 'manager' }, { dimension: expression });
}

export async function mutateActivities(ids: string[], operation: string, value = '') {
  if (!ids.length) return { ok: true, count: 0 };
  if (operation === 'done') await runDatasource('crm.activity.done', { ids });
  else if (operation === 'reopen') await runDatasource('crm.activity.reopen', { ids });
  else if (operation === 'reschedule' && value) await runDatasource('crm.activity.reschedule', { ids, due_date: value });
  else return { ok: false, error: 'Unknown activity operation' };
  return { ok: true, count: ids.length };
}

export async function leadExtras(id: string) {
  const [messages, activities, followers, attachments] = await Promise.all([
    queryDatasource('crm.lead_messages', { id }),
    queryDatasource('crm.lead_activities', { id }),
    queryDatasource('crm.lead_followers', { id }),
    queryDatasource('crm.lead_attachments', { id }),
  ]);
  return { messages, activities, followers, attachments };
}

export async function addMessage(leadId: string, body: string) {
  if (!body.trim()) throw Object.assign(new Error('Message body is required'), { status: 400 });
  await runDatasource('crm.add_message', { id: `message-${crypto.randomUUID().slice(0, 8)}`, lead_id: leadId, author: 'Mitchell Admin', body: body.trim() });
  return leadExtras(leadId);
}

export async function addActivity(leadId: string, activityType: string, summary: string, dueDate: string) {
  if (!summary.trim()) throw Object.assign(new Error('Activity summary is required'), { status: 400 });
  await runDatasource('crm.add_activity', { id: `activity-${crypto.randomUUID().slice(0, 8)}`, lead_id: leadId, activity_type: activityType, summary: summary.trim(), due_date: dueDate || null });
  return leadExtras(leadId);
}

export async function addFollower(leadId: string, name: string) {
  if (!name.trim()) throw Object.assign(new Error('Follower name is required'), { status: 400 });
  await runDatasource('crm.add_follower', { id: `follower-${crypto.randomUUID().slice(0, 8)}`, lead_id: leadId, name: name.trim() });
  return leadExtras(leadId);
}

export async function addAttachment(leadId: string, name: string) {
  if (!name.trim()) throw Object.assign(new Error('Attachment name is required'), { status: 400 });
  await runDatasource('crm.add_attachment', { id: `attachment-${crypto.randomUUID().slice(0, 8)}`, lead_id: leadId, name: name.trim() });
  return leadExtras(leadId);
}

export async function addAttachmentFile(leadId: string, file: File) {
  if (!file.name || !file.size) throw Object.assign(new Error('Attachment file is required'), { status: 400 });
  if (file.size > MAX_ATTACHMENT_BYTES) throw Object.assign(new Error('Attachment file is too large'), { status: 413 });
  const id = `attachment-${crypto.randomUUID().slice(0, 8)}`;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storedPath = `${id}-${safeName}`;
  await mkdir(uploadDirectory, { recursive: true });
  await Bun.write(join(uploadDirectory, storedPath), file);
  await runDatasource('crm.save_attachment_file', { id, lead_id: leadId, name: file.name, stored_path: storedPath, mime_type: file.type || 'application/octet-stream', file_size: file.size });
  return leadExtras(leadId);
}

export async function attachmentFile(id: string) {
  return (await queryDatasource('crm.attachment', { id }))[0] || null;
}

export async function saveLead(values: Record<string, unknown>) {
  return runDatasource('crm.save_lead', { values });
}
