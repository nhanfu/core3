import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';

const databasePath = join(mkdtempSync(join(tmpdir(), 'core3-crm-test-')), 'fixture.duckdb');
process.env.CRM_DB_PATH = databasePath;
const database = await import('../database.ts');

await database.initDatabase();

describe('CRM DuckDB contract', () => {
  test('backfills stable relation IDs and exposes lookup labels', async () => {
    const lead = await database.getLead('opp-001');
    const lookups = await database.crmLookups();
    expect(lead?.partner_id).toBe('partner-deco');
    expect(lead?.team_id).toBe('team-na');
    expect(lead?.salesperson_id).toBe('user-mitchell');
    expect(lookups.partners.some(row => row.id === 'partner-deco')).toBe(true);
    expect(lookups.tags.some(row => row.id === 'tag-warm')).toBe(true);
  });

  test('saves relation labels and join rows from stable IDs', async () => {
    const before = await database.getLead('opp-001');
    await database.saveLead({ id: 'opp-001', name: 'Office refurbishment', partner_id: 'partner-azure', team_id: 'team-eu', salesperson_id: 'user-marc', tag_ids: 'Services,Large' });
    const lead = await database.getLead('opp-001');
    expect(lead?.partner_id).toBe('partner-azure');
    expect(lead?.partner_name).toBe('Azure Interior');
    expect(lead?.team_id).toBe('team-eu');
    expect(lead?.team).toBe('Europe');
    expect(lead?.salesperson_id).toBe('user-marc');
    expect(lead?.salesperson).toBe('Marc Demo');
    expect(lead?.tag_ids).toBe('tag-large,tag-services');
    let conflict = false;
    try { await database.saveLead({ id: 'opp-001', name: 'Stale update', write_version: before?.write_version }); } catch (error: any) { conflict = error?.status === 409; }
    expect(conflict).toBe(true);
  });

  test('validates imports and exposes dimensioned reporting', async () => {
    const preview = await database.previewImport([{ name: 'Valid', type: 'lead' }, { name: '', stage_id: 'invalid' }, { name: 'Bad numeric', expected_revenue: 'abc' }]);
    expect(preview[0].errors).toEqual([]);
    expect(preview[1].errors).toEqual(['name is required', 'unknown stage_id']);
    expect(preview[2].errors).toEqual(['expected_revenue must be numeric']);
    await database.previewImportWithHistory([{ name: '', stage_id: 'invalid' }]);
    expect((await database.importHistory())[0]?.error_count).toBe(1);
    const report = await database.reportAnalysis('team');
    expect(report.some(row => row.label === 'Europe')).toBe(true);
    const forecast = await database.reportAnalysis('closing_bucket', 'salesperson');
    expect(forecast.every(row => Number(row.revenue) >= 0)).toBe(true);
    const leads = await database.leadAnalysis('source', 'salesperson');
    expect(leads.reduce((total, row) => total + Number(row.created_count), 0)).toBe(3);
    expect((await database.leadAnalysis('source', 'manager', 'Website inquiry')).reduce((total, row) => total + Number(row.created_count), 0)).toBe(1);
    expect((await database.activityAnalysis('activity_type', 'manager', 'timeline')).reduce((total, row) => total + Number(row.scheduled), 0)).toBe(1);
    await database.commitImport([{ name: 'Imported history row', type: 'lead', partner_name: 'Deco Addict', expected_revenue: '9000', expected_closing: '2030-02-03', notes: 'Imported note' }]);
    expect((await database.importHistory())[0]?.imported_count).toBe(1);
    const imported = await database.listLeads('Imported history row', { role: 'manager' });
    expect(imported[0]?.partner_id).toBe('partner-deco');
    expect(new Date(imported[0]?.expected_closing).toISOString()).toContain('2030-02-03');
    const drilldown = await database.reportDrilldown('team', 'North America', 'salesperson');
    expect(drilldown.every(row => row.team === 'North America' && (row.salesperson === 'Mitchell Admin' || !row.salesperson))).toBe(true);
    const merge = await database.mergePreview(['opp-001', 'opp-004']);
    expect(merge.primary?.id).toBe('opp-001');
    expect(merge.duplicates[0]?.id).toBe('opp-004');
  });

  test('enforces salesperson ownership scope for leads and activities', async () => {
    expect(await database.canAccessLead('opp-002', 'salesperson')).toBe(false);
    expect(await database.canAccessLead('opp-004', 'salesperson')).toBe(true);
    expect(await database.canAccessLeads(['opp-004'], 'salesperson')).toBe(true);
    expect(await database.canAccessLeads(['opp-002'], 'salesperson')).toBe(false);
    const activities = await database.listActivities({ role: 'salesperson' });
    expect(activities.every(row => row.salesperson === 'Mitchell Admin' || !row.salesperson)).toBe(true);
    if (activities[0]) expect(await database.canAccessActivities([activities[0].id], 'salesperson')).toBe(true);
    const activityReport = await database.activityAnalysis('activity_type', 'salesperson');
    expect(activityReport.reduce((total, row) => total + Number(row.scheduled), 0)).toBe(activities.length);
    await database.mutateActivities(['activity-001'], 'done');
    expect((await database.listActivities({ status: 'done', role: 'manager' })).some(row => row.id === 'activity-001')).toBe(true);
    await database.mutateActivities(['activity-001'], 'reopen');
    await database.mutateActivities(['activity-001'], 'reschedule', '2030-01-02');
    expect(String((await database.listActivities({ role: 'manager' })).find(row => row.id === 'activity-001')?.due_date)).toContain('2030');
  });

  test('converts a lead through the customer-linking workflow', async () => {
    const converted = await database.convertLead('lead-001', 'Converted customer');
    expect(converted?.type).toBe('opportunity');
    expect(converted?.partner_name).toBe('Converted customer');
    expect(converted?.partner_id).toMatch(/^partner-/);
  });

  test('persists manager configuration catalogs', async () => {
    await database.saveCrmStages([{ id: 'qualified', name: 'Qualified', folded: false, requirements: 'Budget confirmed' }]);
    expect((await database.crmStages()).find(row => row.id === 'qualified')?.requirements).toBe('Budget confirmed');
    await database.saveCrmStages([{ id: 'negotiation', name: 'Negotiation', folded: false, requirements: 'Decision maker identified' }]);
    expect((await database.crmStages()).find(row => row.id === 'negotiation')?.name).toBe('Negotiation');
    await database.saveCatalogRow('recurring_plans', { id: 'recurring-monthly', name: 'Monthly billing', interval_number: 1, interval_unit: 'month' });
    const plans = await database.catalogRows('recurring_plans');
    expect(plans.find(row => row.id === 'recurring-monthly')?.name).toBe('Monthly billing');
    expect((await database.getLead('opp-004'))?.recurring_plan_id).toBe('recurring-monthly');
  });

  test('creates customers and teams through their relation editors', async () => {
    const customer = await database.saveCustomer({ name: 'Contract Customer', email: 'contract@example.com' });
    const team = await database.saveTeam({ name: 'Contract Team', member_ids: ['user-mitchell', 'user-marc'] });
    expect(customer.name).toBe('Contract Customer');
    expect(team.name).toBe('Contract Team');
    expect((await database.getTeam(team.id)).member_ids).toBe('user-marc,user-mitchell');
    expect((await database.listTeams()).some(row => row.name === 'North America' && Number(row.member_count) >= 1)).toBe(true);
    expect((await database.customerRelated('partner-azure')).leads.some(row => row.id === 'opp-001')).toBe(true);
    const teamLeads = await database.listLeads('', { teamId: 'team-na', role: 'manager' });
    expect(teamLeads.every(row => row.team_id === 'team-na' || row.team === 'North America')).toBe(true);
  });

  test('stores uploaded attachments and exposes download metadata', async () => {
    await database.addAttachmentFile('opp-001', new File(['proposal'], 'proposal.txt', { type: 'text/plain' }));
    const extras = await database.leadExtras('opp-001');
    const attachment = extras.attachments.find(row => row.name === 'proposal.txt');
    expect(attachment?.mime_type).toContain('text/plain');
    expect(Number(attachment?.file_size)).toBe(8);
    expect(attachment?.stored_path).toContain('attachment-');
  });
});
