import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import { createAiAgentApi } from '../services/ai/api/ai-agent-api.ts';

const crmRoot = join(import.meta.dir, '../services/crm');
const baseRoot = join(import.meta.dir, '../services/base');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(crmRoot, file), 'utf8')) as any;
const aiYaml = (file: string) => Bun.YAML.parse(readFileSync(join(import.meta.dir, '../services/ai', file), 'utf8')) as any;
const action = (page: any, id: string) => page.actions.find((candidate: any) => candidate.id === id);

describe('CRM YAML lifecycle integration', () => {
  it('applies and replays the Base saved-view concurrency migration', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(baseRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'base_saved_view_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'base_saved_view_schema_migrations', ['schema', 'data']);
    expect((await repository.query("SELECT version FROM base_saved_view_schema_migrations WHERE version = '0.0.5'")).length).toBe(1);
    expect((await repository.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'ui_saved_views' AND column_name = 'row_version'")).length).toBe(1);
  });

  it('increments saved-view filter versions and rejects stale edits', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`CREATE TABLE ui_saved_views(id VARCHAR PRIMARY KEY, label VARCHAR, visibility VARCHAR, team VARCHAR, filters JSON, group_by VARCHAR, filter_version INTEGER DEFAULT 1, row_version INTEGER DEFAULT 1, owner_id VARCHAR, usage_count INTEGER DEFAULT 0)`);
    await repository.run("INSERT INTO ui_saved_views(id, label, visibility, filters, filter_version, row_version, owner_id) VALUES ('view-1', 'Pipeline', 'private', '{\"stage\":\"New\"}', 1, 1, 'user-1')");
    const edit = action(Bun.YAML.parse(readFileSync(join(crmRoot, '../../services/base/pages/saved-views.yaml'), 'utf8')) as any, 'edit_saved_view');
    const apply = (filters: string, expected_row_version: number) => repository.executeMutation(edit.mutation, { id: 'view-1', current_user_id: 'user-1', values: { label: 'Pipeline', visibility: 'private', team: null, filters, group_by: null, expected_row_version } });
    await apply('{\"stage\":\"Qualified\"}', 1);
    expect((await repository.query("SELECT filter_version, row_version FROM ui_saved_views WHERE id = 'view-1'"))[0]).toMatchObject({ filter_version: 2, row_version: 2 });
    await apply('{\"stage\":\"Qualified\"}', 2);
    expect((await repository.query("SELECT filter_version, row_version FROM ui_saved_views WHERE id = 'view-1'"))[0]).toMatchObject({ filter_version: 2, row_version: 2 });
    await expect(apply('{\"stage\":\"Won\"}', 1)).rejects.toMatchObject({ code: 'STALE_RECORD' });
  });

  it('exposes permissioned lead distribution by team and assignment source', () => {
    const page = yaml('pages/lead-distribution.yaml');
    const query = String(page.datasources[0].query);
    expect(query).toContain('assignment_source');
    expect(query).toContain('crm_activities');
    expect(query).toContain("stage NOT IN ('Won', 'Lost')");
    expect(page.components[0].filters[0].options_source).toBe('crm_lead_distribution_teams');
  });

  it('exposes guarded lead enrichment with audit provenance', () => {
    const page = yaml('pages/lead-enrichment.yaml');
    const enrich = action(page, 'edit_lead_enrichment');
    expect(String(page.datasources[0].query)).toContain("stage NOT IN ('Won', 'Lost')");
    expect(enrich.action).toBe('crm.leads.enrich');
    expect(String(enrich.mutation.guards[1].query)).toContain("LIKE '%@%'");
    expect(String(enrich.mutation.steps[0].query)).toContain("'enrichment'");
  });

  it('declares guarded referral attribution on opportunity detail', () => {
    const page = yaml('pages/lead-detail.yaml');
    const referral = action(page, 'set_lead_referrer');
    expect(String(page.datasources[0].query)).toContain('referrer_name');
    expect(referral.action).toBe('crm.leads.set_referrer');
    expect(String(referral.mutation.guards[1].query)).toContain('base_contacts');
    expect(String(referral.mutation.steps[0].query)).toContain("'referral'");
  });

  it('declares review-only lead mining requests and contact candidates', () => {
    const page = yaml('pages/lead-mining.yaml');
    const request = action(page, 'create_lead_mining_request');
    expect(request.action).toBe('crm.lead_mining.request');
    expect(String(page.datasources[1].query)).toContain('base_contacts');
    expect(String(page.datasources[1].query)).toContain(':city');
    expect(request.mutation.table).toBe('crm_lead_mining_requests');
    expect(request.mutation.defaults.status).toBe('review');
    const create = action(page, 'create_lead_from_mining_candidate');
    expect(create.action).toBe('crm.lead_mining.create_lead');
    expect(String(create.mutation.guards[1].query)).toContain('crm_leads');
    expect(String(create.mutation.steps[0].query)).toContain('lead_mining');
  });

  it('creates one lead from an active mining candidate and rejects duplicates', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`CREATE TABLE base_contacts(id VARCHAR PRIMARY KEY, active BOOLEAN); CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, name VARCHAR, type VARCHAR, partner_id VARCHAR, partner_name VARCHAR, email VARCHAR, phone VARCHAR, source VARCHAR, stage VARCHAR, probability INTEGER, expected_revenue INTEGER, active BOOLEAN DEFAULT true); CREATE TABLE crm_activities(id VARCHAR PRIMARY KEY, lead_id VARCHAR, activity_type VARCHAR, summary VARCHAR, state VARCHAR, completed_at TIMESTAMP, created_by VARCHAR); INSERT INTO base_contacts VALUES ('candidate-1', true)`);
    const create = action(yaml('pages/lead-mining.yaml'), 'create_lead_from_mining_candidate');
    const input = { id: 'candidate-lead-1', current_user_name: 'Seller', values: { name: 'Candidate opportunity', partner_id: 'candidate-1', partner_name: 'Candidate One', email: 'candidate@example.test', phone: '123456789' } };
    const created = await repository.executeMutation(create.mutation, input);
    expect(created).toMatchObject({ id: 'candidate-lead-1', partner_id: 'candidate-1', source: 'Lead Mining' });
    expect((await repository.query("SELECT activity_type FROM crm_activities WHERE lead_id = 'candidate-lead-1'"))[0].activity_type).toBe('lead_mining');
    await expect(repository.executeMutation(create.mutation, { ...input, id: 'candidate-lead-2' })).rejects.toThrow('active CRM lead already exists');
  });

  it('applies valid lead enrichment and records one audit activity', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, name VARCHAR, stage VARCHAR, active BOOLEAN, partner_id VARCHAR, partner_name VARCHAR, email VARCHAR, phone VARCHAR, row_version INTEGER DEFAULT 1, updated_at TIMESTAMP); CREATE TABLE base_contacts(id VARCHAR PRIMARY KEY, name VARCHAR, active BOOLEAN); CREATE TABLE crm_activities(id VARCHAR PRIMARY KEY, lead_id VARCHAR, activity_type VARCHAR, summary VARCHAR, state VARCHAR, completed_at TIMESTAMP, created_by VARCHAR); INSERT INTO crm_leads(id, name, stage, active) VALUES ('enrich-1', 'Enrich me', 'New', true); INSERT INTO base_contacts VALUES ('contact-1', 'Acme Contact', true)`);
    const enrich = action(yaml('pages/lead-enrichment.yaml'), 'edit_lead_enrichment');
    await repository.executeMutation(enrich.mutation, { id: 'enrich-1', current_user_name: 'Seller', values: { partner_id: 'contact-1', partner_name: '', email: 'buyer@example.test', phone: '123456789', expected_row_version: 1 } });
    expect((await repository.query("SELECT partner_id, partner_name, email, phone FROM crm_leads WHERE id = 'enrich-1'"))[0]).toMatchObject({ partner_id: 'contact-1', partner_name: 'Acme Contact', email: 'buyer@example.test', phone: '123456789' });
    expect((await repository.query("SELECT activity_type, created_by FROM crm_activities WHERE lead_id = 'enrich-1'"))[0]).toMatchObject({ activity_type: 'enrichment', created_by: 'Seller' });
  });

  it('declares bounded nurture sequences over ordered activity plans', () => {
    const page = yaml('pages/lead-detail.yaml');
    const nurture = action(page, 'apply_nurture_sequence');
    expect(page.datasources.map((source: any) => source.id)).toContain('crm_nurture_plans_detail');
    expect(nurture.action).toBe('crm.activities.apply_nurture');
    expect(String(nurture.mutation.guards[1].query)).toContain('is_nurture = true');
    expect(String(nurture.mutation.steps[0].query)).toContain('ORDER BY s.sequence');
    expect(String(nurture.mutation.steps[1].query)).toContain("'nurture'");
    const configuration = yaml('pages/configuration.yaml');
    expect(String(configuration.datasources.find((source: any) => source.id === 'crm_activity_plan_configuration').query)).toContain('p.is_nurture');
  });

  it('applies an active nurture sequence as ordered future activities', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, stage VARCHAR, active BOOLEAN, salesperson VARCHAR); CREATE TABLE crm_activity_plans(id VARCHAR PRIMARY KEY, active BOOLEAN, is_nurture BOOLEAN); CREATE TABLE crm_activity_plan_steps(id VARCHAR PRIMARY KEY, plan_id VARCHAR, sequence INTEGER, activity_type VARCHAR, summary VARCHAR, delay_days INTEGER, active BOOLEAN); CREATE TABLE crm_activities(id VARCHAR PRIMARY KEY, lead_id VARCHAR, activity_type VARCHAR, summary VARCHAR, due_date DATE, assigned_to VARCHAR, state VARCHAR, completed_at TIMESTAMP, created_by VARCHAR, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await repository.run("INSERT INTO crm_leads VALUES ('nurture-lead', 'New', true, 'Seller'); INSERT INTO crm_activity_plans VALUES ('nurture-1', true, true); INSERT INTO crm_activity_plan_steps VALUES ('step-2', 'nurture-1', 20, 'Email', 'Send follow-up', 4, true), ('step-1', 'nurture-1', 10, 'Call', 'Qualify', 2, true)");
    const nurture = action(yaml('pages/lead-detail.yaml'), 'apply_nurture_sequence');
    await repository.executeMutation(nurture.mutation, { lead_id: 'nurture-lead', plan_id: 'nurture-1', current_user_name: 'Seller' });
    await repository.executeMutation(nurture.mutation, { lead_id: 'nurture-lead', plan_id: 'nurture-1', current_user_name: 'Seller' });
    expect((await repository.query("SELECT activity_type, summary FROM crm_activities WHERE lead_id = 'nurture-lead' ORDER BY due_date, summary")).map((row: any) => row.activity_type)).toEqual(['Call', 'Email', 'nurture']);
  });

  it('applies the complete CRM migration chain on a fresh DuckDB database', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(crmRoot, 'migrations'), undefined, 'crm_test_schema_migrations', ['schema', 'data']);
    expect((await repository.query("SELECT version FROM crm_test_schema_migrations WHERE version = '0.0.15'")).length).toBe(1);
    expect((await repository.query("SELECT version FROM crm_test_schema_migrations WHERE version = '0.0.18'")).length).toBe(1);
    expect((await repository.query("SELECT version FROM crm_test_schema_migrations WHERE version = '0.0.20'")).length).toBe(1);
    expect((await repository.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'crm_lead_followers'")).length).toBe(1);
    expect((await repository.query("SELECT table_name FROM information_schema.tables WHERE table_name IN ('crm_leads', 'crm_tags', 'crm_activity_plans', 'crm_team_members') ORDER BY table_name")).map((row: any) => row.table_name)).toEqual(['crm_activity_plans', 'crm_leads', 'crm_tags', 'crm_team_members']);
    expect((await repository.query('SELECT COUNT(*) AS count FROM crm_team_members'))[0].count).toBeGreaterThan(0);
    expect((await repository.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name IN ('recurring_plan', 'recurring_revenue') ORDER BY column_name")).map((row: any) => row.column_name)).toEqual(['recurring_plan', 'recurring_revenue']);
    expect((await repository.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'crm_assignment_rules'")).length).toBe(1);
    expect((await repository.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'crm_activity_plans' AND column_name = 'is_nurture'")).length).toBe(1);
  });

  it('reruns the CRM migration chain safely as an upgrade', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(crmRoot, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'crm_upgrade_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'crm_upgrade_schema_migrations', ['schema', 'data']);
    expect((await repository.query("SELECT COUNT(*) AS count FROM crm_upgrade_schema_migrations WHERE version >= '0.0.1'")).length).toBeGreaterThan(0);
    expect((await repository.query("SELECT active FROM crm_leads WHERE id = 'crm-demo-001'")).length).toBe(1);
    expect((await repository.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'crm_activities' AND column_name IN ('assigned_to', 'created_by') ORDER BY column_name")).map((row: any) => row.column_name)).toEqual(['assigned_to', 'created_by']);
  });

  it('converts an open lead and records an activity', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_leads(
        id VARCHAR PRIMARY KEY, row_version BIGINT DEFAULT 1, name VARCHAR, type VARCHAR,
        partner_id VARCHAR, partner_name VARCHAR, email VARCHAR, phone VARCHAR,
        stage VARCHAR, probability INTEGER DEFAULT 10, lost_reason VARCHAR,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE base_contacts(id VARCHAR PRIMARY KEY, name VARCHAR, email VARCHAR, phone VARCHAR, active BOOLEAN DEFAULT true);
      CREATE TABLE crm_activities(
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), lead_id VARCHAR,
        activity_type VARCHAR, summary VARCHAR, state VARCHAR, completed_at TIMESTAMP
      );
      INSERT INTO crm_leads(id, name, type, partner_id, stage) VALUES ('lead-1', 'Test lead', 'lead', 'contact-1', 'New');
      INSERT INTO base_contacts(id, name, email, phone) VALUES ('contact-1', 'Canonical Customer', 'customer@example.test', '+1 555 0101');
    `);

    const page = yaml('pages/leads.yaml');
    const converted = await repository.executeMutation(action(page, 'convert_lead').mutation, { id: 'lead-1' });
    expect(converted.type).toBe('opportunity');
    expect(converted).toMatchObject({ partner_name: 'Canonical Customer', email: 'customer@example.test', phone: '+1 555 0101' });
    expect((await repository.query('SELECT type, row_version FROM crm_leads WHERE id = ?', ['lead-1']))[0]).toMatchObject({ type: 'opportunity', row_version: 2 });
    expect((await repository.query('SELECT summary, state FROM crm_activities WHERE lead_id = ?', ['lead-1']))[0]).toMatchObject({ summary: 'Lead converted to opportunity', state: 'done' });
  });

  it('captures inbound leads through an active team alias and records provenance', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`CREATE TABLE crm_teams(id VARCHAR, name VARCHAR, email_alias VARCHAR, active BOOLEAN, use_leads BOOLEAN); CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR, type VARCHAR, email VARCHAR, phone VARCHAR, source VARCHAR, team VARCHAR, origin_team VARCHAR, intake_channel VARCHAR, received_at TIMESTAMP, stage VARCHAR, probability INTEGER, expected_revenue INTEGER); CREATE TABLE crm_activities(id VARCHAR, lead_id VARCHAR, activity_type VARCHAR, summary VARCHAR, state VARCHAR, completed_at TIMESTAMP, created_by VARCHAR); INSERT INTO crm_teams VALUES ('team-1', 'Inbound', 'sales', true, true);`);
    const result = await repository.executeMutation(action(yaml('pages/leads.yaml'), 'create_lead_from_team_alias').mutation, { team_alias: 'SALES', name: 'Inbound request', email: 'buyer@example.test' });
    expect(result).toMatchObject({ name: 'Inbound request', source: 'Email', team: 'Inbound', origin_team: 'Inbound', intake_channel: 'email_alias', type: 'lead' });
    expect(result.received_at).toBeTruthy();
    expect((await repository.query("SELECT activity_type, summary FROM crm_activities WHERE lead_id = ?", [result.id]))[0]).toMatchObject({ activity_type: 'message', summary: 'Inbound lead received through team email alias' });
    await expect(repository.executeMutation(action(yaml('pages/leads.yaml'), 'create_lead_from_team_alias').mutation, { team_alias: 'disabled', name: 'Rejected', email: 'buyer@example.test' })).rejects.toThrow('Inbound alias is inactive or unavailable');
  });

  it('applies explicit conversion customer and assignment choices', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, type VARCHAR, stage VARCHAR, partner_id VARCHAR, partner_name VARCHAR, salesperson VARCHAR, team VARCHAR, row_version INTEGER DEFAULT 1, updated_at TIMESTAMP); CREATE TABLE base_contacts(id VARCHAR PRIMARY KEY, name VARCHAR, active BOOLEAN); CREATE TABLE crm_teams(name VARCHAR, active BOOLEAN); CREATE TABLE crm_team_members(user_name VARCHAR, active BOOLEAN); CREATE TABLE crm_activities(id VARCHAR, lead_id VARCHAR, activity_type VARCHAR, summary VARCHAR, state VARCHAR, completed_at TIMESTAMP); INSERT INTO crm_leads(id, type, stage) VALUES ('choice-1', 'lead', 'New'); INSERT INTO base_contacts VALUES ('contact-1', 'Chosen Customer', true); INSERT INTO crm_teams VALUES ('Enterprise', true); INSERT INTO crm_team_members VALUES ('Seller', true);`);
    const converted = await repository.executeMutation(action(yaml('pages/lead-detail.yaml'), 'convert_lead_detail').mutation, { id: 'choice-1', partner_id: 'contact-1', team: 'Enterprise', salesperson: 'Seller' });
    expect(converted).toMatchObject({ type: 'opportunity', partner_id: 'contact-1', partner_name: 'Chosen Customer', team: 'Enterprise', salesperson: 'Seller' });
  });

  it('schedules a Meeting from an active open opportunity', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, active BOOLEAN, stage VARCHAR); CREATE TABLE crm_activity_types(name VARCHAR, active BOOLEAN); CREATE TABLE crm_activities(id VARCHAR, lead_id VARCHAR, activity_type VARCHAR, summary VARCHAR, due_date DATE, assigned_to VARCHAR, state VARCHAR); INSERT INTO crm_leads VALUES ('meeting-1', true, 'Proposition'); INSERT INTO crm_activity_types VALUES ('Meeting', true);`);
    const meeting = action(yaml('pages/lead-detail.yaml'), 'schedule_lead_meeting');
    const result = await repository.executeMutation(meeting.mutation, { lead_id: 'meeting-1', due_date: '2026-09-10', summary: 'Customer demo' });
    expect(result).toMatchObject({ lead_id: 'meeting-1', activity_type: 'Meeting', summary: 'Customer demo', state: 'planned' });
    await repository.run("UPDATE crm_leads SET stage = 'Won' WHERE id = 'meeting-1'");
    await expect(repository.executeMutation(meeting.mutation, { lead_id: 'meeting-1', due_date: '2026-09-11' })).rejects.toThrow('Only active open opportunities can have meetings scheduled');
  });

  it('converts an unlinked lead while creating and linking a customer', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, type VARCHAR, partner_id VARCHAR, partner_name VARCHAR, email VARCHAR, phone VARCHAR, stage VARCHAR, row_version BIGINT DEFAULT 1, updated_at TIMESTAMP);
      CREATE TABLE base_contacts(id VARCHAR PRIMARY KEY, name VARCHAR, email VARCHAR, phone VARCHAR, active BOOLEAN DEFAULT true);
      CREATE TABLE crm_activities(id VARCHAR PRIMARY KEY, lead_id VARCHAR, activity_type VARCHAR, summary VARCHAR, state VARCHAR, completed_at TIMESTAMP);
      INSERT INTO crm_leads(id, type, email, phone, stage) VALUES ('lead-new-contact', 'lead', 'prospect@example.test', '+1 555 0199', 'New');
    `);
    const conversion = action(yaml('pages/lead-detail.yaml'), 'convert_lead_create_contact_detail');
    const converted = await repository.executeMutation(conversion.mutation, {
      id: 'lead-new-contact', contact_name: 'Prospective Customer', contact_email: 'prospect@example.test', contact_phone: '+1 555 0199',
    });
    expect(converted).toMatchObject({ type: 'opportunity', partner_name: 'Prospective Customer', partner_id: 'crm-lead-contact-lead-new-contact' });
    expect((await repository.query("SELECT name, email FROM base_contacts WHERE id = 'crm-lead-contact-lead-new-contact'"))[0]).toMatchObject({ name: 'Prospective Customer', email: 'prospect@example.test' });
    expect((await repository.query("SELECT summary, state FROM crm_activities WHERE lead_id = 'lead-new-contact'"))[0]).toMatchObject({ summary: 'Lead converted and customer created', state: 'done' });
  });

  it('reopens a lost opportunity and clears its lost reason', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, row_version BIGINT DEFAULT 1, name VARCHAR, type VARCHAR, stage VARCHAR, probability INTEGER, lost_reason VARCHAR, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); CREATE TABLE crm_activities(id VARCHAR PRIMARY KEY, lead_id VARCHAR, activity_type VARCHAR, summary VARCHAR, state VARCHAR, completed_at TIMESTAMP); INSERT INTO crm_leads(id, name, type, stage, probability, lost_reason) VALUES ('lost-1', 'Lost deal', 'opportunity', 'Lost', 0, 'Budget');`);

    const workflow = yaml('pages/lead-workflow.yaml').workflow;
    const reopen = workflow.transitions.find((transition: any) => transition.id === 'reopen').mutation;
    const reopened = await repository.executeMutation(reopen, { id: 'lost-1' });
    expect(reopened).toMatchObject({ stage: 'New', probability: 10, lost_reason: null });
    expect((await repository.query('SELECT summary, state FROM crm_activities WHERE lead_id = ?', ['lost-1']))[0]).toMatchObject({ summary: 'Opportunity reopened', state: 'done' });
  });

  it('merges selected open records into the deterministic survivor', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, row_version BIGINT DEFAULT 1, name VARCHAR,
        type VARCHAR, partner_id VARCHAR, partner_name VARCHAR, email VARCHAR, phone VARCHAR, source VARCHAR,
        salesperson VARCHAR, team VARCHAR, tags VARCHAR, utm_campaign VARCHAR, utm_medium VARCHAR, utm_source VARCHAR, expected_revenue INTEGER, stage VARCHAR, probability INTEGER, lost_reason VARCHAR,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE crm_activities(id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), lead_id VARCHAR, activity_type VARCHAR,
        summary VARCHAR, state VARCHAR, completed_at TIMESTAMP, created_by VARCHAR);
      CREATE TABLE crm_merge_audit(id VARCHAR PRIMARY KEY, survivor_id VARCHAR, merged_id VARCHAR, actor VARCHAR, retained_fields VARCHAR, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      INSERT INTO crm_leads(id, name, type, stage, probability) VALUES ('closed-a', 'Closed', 'opportunity', 'Won', 100);
      INSERT INTO crm_leads(id, name, type, stage, probability, partner_name, email, source, salesperson, team, tags, expected_revenue) VALUES ('lead-z', 'Primary', 'opportunity', 'New', 10, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
      INSERT INTO crm_leads(id, name, type, stage, probability, partner_name, email, source, salesperson, team, tags, utm_campaign, utm_medium, utm_source, expected_revenue) VALUES ('lead-a', 'Duplicate', 'lead', 'Qualified', 20, 'Acme', 'buyer@example.test', 'Website', 'Sales User', 'Enterprise', 'urgent, enterprise', 'spring-launch', 'email', 'newsletter', 4200);
      INSERT INTO crm_activities(id, lead_id, activity_type, summary, state)
        VALUES ('activity-b', 'lead-a', 'Call', 'Follow up', 'planned');
    `);

    const page = yaml('pages/leads.yaml');
    const merged = await repository.executeMutation(action(page, 'merge_leads').mutation, { selectedIds: ['closed-a', 'lead-a', 'lead-z'] });
    expect(merged.id).toBe('lead-z');
    expect((await repository.query('SELECT id FROM crm_leads ORDER BY id'))).toEqual([{ id: 'closed-a' }, { id: 'lead-z' }]);
    expect((await repository.query('SELECT lead_id FROM crm_activities WHERE id = ?', ['activity-b']))[0].lead_id).toBe('lead-z');
    expect((await repository.query("SELECT activity_type, summary, state, created_by FROM crm_activities WHERE lead_id = 'lead-z' AND activity_type = 'merge'"))[0]).toMatchObject({ activity_type: 'merge', summary: 'Duplicate CRM records merged', state: 'done' });
    expect((await repository.query("SELECT survivor_id, merged_id, retained_fields FROM crm_merge_audit"))[0]).toMatchObject({ survivor_id: 'lead-z', merged_id: 'lead-a', retained_fields: 'first_non_empty_declared_fields' });
    expect((await repository.query('SELECT partner_name, email, source, salesperson, team, tags, utm_campaign, utm_medium, utm_source, expected_revenue, row_version FROM crm_leads WHERE id = ?', ['lead-z']))[0]).toMatchObject({ partner_name: 'Acme', email: 'buyer@example.test', source: 'Website', salesperson: 'Sales User', team: 'Enterprise', tags: 'urgent, enterprise', utm_campaign: 'spring-launch', utm_medium: 'email', utm_source: 'newsletter', expected_revenue: 4200, row_version: 2 });
  });

  it('enforces the sales team lead setting when creating a lead', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, name VARCHAR, type VARCHAR, partner_id VARCHAR, partner_name VARCHAR, source VARCHAR, team VARCHAR,
        stage VARCHAR, probability INTEGER, expected_revenue INTEGER, priority VARCHAR);
      CREATE TABLE base_contacts(id VARCHAR PRIMARY KEY, name VARCHAR, active BOOLEAN DEFAULT true);
      CREATE TABLE crm_teams(name VARCHAR PRIMARY KEY, use_leads BOOLEAN, active BOOLEAN DEFAULT true);
      CREATE TABLE crm_team_members(id VARCHAR PRIMARY KEY, team_id VARCHAR, user_name VARCHAR, active BOOLEAN DEFAULT true);
      CREATE TABLE crm_sources(name VARCHAR PRIMARY KEY, active BOOLEAN);
      INSERT INTO crm_teams(name, use_leads) VALUES ('No Leads Team', false), ('Lead Team', true);
      INSERT INTO crm_sources VALUES ('Website', true);
    `);
    const create = action(yaml('pages/leads.yaml'), 'create_lead').mutation;
    await expect(repository.executeMutation(create, {
      id: 'blocked-lead', values: { name: 'Blocked', type: 'lead', team: 'No Leads Team' },
    })).rejects.toThrow('This sales team does not accept new leads');
    const created = await repository.executeMutation(create, {
      id: 'allowed-lead', values: { name: 'Allowed', type: 'lead', team: 'Lead Team' },
    });
    expect(created.id).toBe('allowed-lead');
  });

  it('chains the next planned activity when an activity is completed', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_activities(
        id VARCHAR PRIMARY KEY, lead_id VARCHAR, activity_type VARCHAR, summary VARCHAR,
        due_date DATE, assigned_to VARCHAR, state VARCHAR, completed_at TIMESTAMP,
        next_activity_type VARCHAR, next_activity_summary VARCHAR, next_activity_due_date DATE
      );
      INSERT INTO crm_activities(id, lead_id, activity_type, summary, state,
        next_activity_type, next_activity_summary) VALUES
        ('activity-1', 'lead-1', 'Call', 'Qualify account', 'planned', 'Meeting', 'Demo product');
    `);
    const complete = action(yaml('pages/lead-detail.yaml'), 'complete_lead_activity').mutation;
    await repository.executeMutation(complete, { id: 'activity-1' });
    expect((await repository.query('SELECT state FROM crm_activities WHERE id = ?', ['activity-1']))[0].state).toBe('done');
    expect((await repository.query("SELECT activity_type, summary, state FROM crm_activities WHERE lead_id = 'lead-1' AND id <> 'activity-1'"))[0]).toMatchObject({ activity_type: 'Meeting', summary: 'Demo product', state: 'planned' });
  });

  it('enforces the active activity-type catalog when scheduling', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_activities(id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), lead_id VARCHAR,
        activity_type VARCHAR, summary VARCHAR, due_date DATE, assigned_to VARCHAR, state VARCHAR,
        next_activity_type VARCHAR, next_activity_summary VARCHAR, next_activity_due_date DATE);
      CREATE TABLE crm_activity_types(name VARCHAR PRIMARY KEY, active BOOLEAN);
      CREATE TABLE crm_team_members(user_name VARCHAR, active BOOLEAN);
      INSERT INTO crm_team_members VALUES ('Sales User', true);
      INSERT INTO crm_activity_types VALUES ('Call', true), ('Legacy', false);
    `);
    const schedule = action(yaml('pages/lead-detail.yaml'), 'schedule_lead_activity').mutation;
    await expect(repository.executeMutation(schedule, { lead_id: 'lead-1', activity_type: 'Legacy', summary: 'Should fail' })).rejects.toThrow('Select an active activity type');
    const created = await repository.executeMutation(schedule, { lead_id: 'lead-1', activity_type: 'Call', summary: 'Call customer' });
    expect(created).toMatchObject({ lead_id: 'lead-1', activity_type: 'Call', state: 'planned' });
  });

  it('calculates a probability-weighted pipeline forecast', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`CREATE TABLE crm_leads(stage VARCHAR, expected_revenue DECIMAL(18,2), probability INTEGER, source VARCHAR, team VARCHAR, salesperson VARCHAR, created_at TIMESTAMP, active BOOLEAN DEFAULT true); INSERT INTO crm_leads(stage, expected_revenue, probability, source, created_at) VALUES ('Proposition', 1000, 60, NULL, CURRENT_TIMESTAMP), ('Qualified', 500, 25, '', CURRENT_TIMESTAMP), ('Won', 900, 100, 'Referral', CURRENT_TIMESTAMP);`);
    const analysis = yaml('pages/analysis.yaml');
    const query = String(analysis.datasources.find((source: any) => source.id === 'crm_pipeline_totals').query);
    const withoutFilters = query.replaceAll(':team', 'NULL').replaceAll(':salesperson', 'NULL').replaceAll(':date_from', 'NULL').replaceAll(':date_to', 'NULL');
    const result = (await repository.query(withoutFilters))[0];
    expect(Number(result.pipeline_revenue)).toBe(1500);
    expect(Number(result.weighted_pipeline_revenue)).toBe(725);
    const bySource = String(analysis.datasources.find((source: any) => source.id === 'crm_pipeline_by_source').query);
    expect(await repository.query(bySource.replaceAll(':team', 'NULL').replaceAll(':salesperson', 'NULL').replaceAll(':date_from', 'NULL').replaceAll(':date_to', 'NULL'))).toEqual([
      { source: 'Unknown', lead_count: 2, revenue: 1500 },
      { source: 'Referral', lead_count: 1, revenue: 900 },
    ]);
    for (const source of analysis.datasources.filter((candidate: any) => candidate.id.startsWith('crm_pipeline') || ['crm_win_loss', 'crm_lost_by_reason', 'crm_source_performance', 'crm_historical_lead_scoring', 'crm_lead_distribution', 'crm_utm_campaign_performance'].includes(candidate.id))) {
      expect(String(source.query)).toContain(':team');
      expect(String(source.query)).toContain(':salesperson');
      expect(String(source.query)).toContain(':date_from');
      expect(String(source.query)).toContain(':date_to');
    }
  });

  it('marks response-overdue leads using team service levels and excludes closed records', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, row_version BIGINT, name VARCHAR, type VARCHAR, partner_id VARCHAR, partner_name VARCHAR, email VARCHAR, salesperson VARCHAR, team VARCHAR, stage VARCHAR, probability INTEGER, expected_revenue INTEGER, expected_closing DATE, active BOOLEAN, created_at TIMESTAMP, updated_at TIMESTAMP);
      CREATE TABLE crm_teams(name VARCHAR PRIMARY KEY, active BOOLEAN, response_hours INTEGER);
      CREATE TABLE crm_activities(id VARCHAR PRIMARY KEY, lead_id VARCHAR, state VARCHAR, due_date DATE);
      INSERT INTO crm_teams VALUES ('Enterprise', true, 4);
      INSERT INTO crm_leads VALUES ('sla-open', 1, 'Old lead', 'lead', NULL, 'Customer', NULL, 'Alice', 'Enterprise', 'New', 10, 100, NULL, true, CURRENT_TIMESTAMP - INTERVAL '8 hours', CURRENT_TIMESTAMP), ('sla-won', 1, 'Won lead', 'opportunity', NULL, 'Customer', NULL, 'Alice', 'Enterprise', 'Won', 100, 100, NULL, true, CURRENT_TIMESTAMP - INTERVAL '8 hours', CURRENT_TIMESTAMP);
    `);
    const source = yaml('pages/unattended-leads.yaml').datasources.find((candidate: any) => candidate.id === 'crm_unattended_leads');
    const result = await repository.query(String(source.query).replaceAll(':q', 'NULL'));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'sla-open', attention: 'Response overdue' });
  });

  it('requires an active configured lost reason', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, stage VARCHAR, lost_reason VARCHAR, probability INTEGER, row_version BIGINT, updated_at TIMESTAMP);
      CREATE TABLE crm_lost_reasons(id VARCHAR PRIMARY KEY, active BOOLEAN);
      CREATE TABLE crm_activities(id VARCHAR PRIMARY KEY, lead_id VARCHAR, activity_type VARCHAR, summary VARCHAR, state VARCHAR, completed_at TIMESTAMP);
      INSERT INTO crm_leads VALUES ('lead-loss', 'New', NULL, 10, 1, CURRENT_TIMESTAMP);
      INSERT INTO crm_lost_reasons VALUES ('reason-active', true), ('reason-off', false);
    `);
    const lost = yaml('pages/lead-workflow.yaml').workflow.transitions.find((transition: any) => transition.id === 'lost').mutation;
    await expect(repository.executeMutation(lost, { id: 'lead-loss', lost_reason: 'reason-off' })).rejects.toThrow('Select an active lost reason');
    const result = await repository.executeMutation(lost, { id: 'lead-loss', lost_reason: 'reason-active' });
    expect(result).toMatchObject({ stage: 'Lost', lost_reason: 'reason-active', probability: 0 });
  });

it('declares the quotation handoff as an orders-permissioned service call', () => {
    const quotation = action(yaml('pages/lead-detail.yaml'), 'create_quotation_from_lead');
    expect(quotation).toMatchObject({
      handler: 'service_call',
      service: 'yaml.service.order',
      service_operation: 'orders.quotation.create',
      permission: 'orders.write',
      params: { opportunity_id: '{state.id}' },
    });
    expect(quotation.success_message).toBe('Quotation created');
    const headerActions = yaml('pages/lead-detail.yaml').components.find((component: any) => component.type === 'OdooFormView').header_actions;
  expect(headerActions.find((candidate: any) => candidate.id === 'create_quotation_from_lead').show_if).toContain("type === 'opportunity'");
  const detail = yaml('pages/lead-detail.yaml');
  expect(String(detail.datasources.find((candidate: any) => candidate.id === 'crm_lead_quotations').query)).toContain('opportunity_id');
  expect(action(detail, 'open_lead_quotation')).toMatchObject({ navigate_to: '/quotations', permission: 'orders.read' });
});

  it('resolves contact lookups through the registered base YAML service', () => {
    expect(yaml('pages/leads.yaml').datasources.find((source: any) => source.id === 'crm_contacts')).toMatchObject({
      type: 'service', service: 'yaml.service.base', operation: 'contacts.search', permission: 'base.contacts.read',
    });
    expect(yaml('pages/leads.yaml').actions.find((candidate: any) => candidate.id === 'edit_lead').mutation.fields).toContain('partner_id');
    expect(yaml('pages/lead-detail.yaml').actions.find((candidate: any) => candidate.id === 'edit_lead_detail').mutation.fields).toContain('partner_id');
    expect(yaml('pages/lead-detail.yaml').actions.find((candidate: any) => candidate.id === 'open_lead_customer')).toMatchObject({
      permission: 'base.contacts.read', navigate_to: '/contact-detail', params: { id: '{state.crm_lead_detail.partner_id}' },
    });
    expect(yaml('pages/leads.yaml').actions.find((candidate: any) => candidate.id === 'open_lead_customer')).toMatchObject({
      permission: 'base.contacts.read', navigate_to: '/contact-detail', params: { id: '{row.partner_id}' },
    });
  });

  it('exposes lead routing fields on create and edit forms', () => {
    const leads = yaml('pages/leads.yaml');
    for (const id of ['create_lead', 'edit_lead']) {
      const fields = action(leads, id).fields;
      expect(fields).toEqual(expect.arrayContaining([
        expect.objectContaining({ field: 'salesperson' }),
        expect.objectContaining({ field: 'team', type: 'select', options_source: 'crm_sales_teams' }),
      ]));
      expect(action(leads, id).mutation.guards.some((guard: any) => String(guard.query).includes('probability') && String(guard.query).includes('BETWEEN 0 AND 100'))).toBe(true);
    }
  });

  it('requires linked CRM contacts to remain active', () => {
    const leads = yaml('pages/leads.yaml');
    const detail = yaml('pages/lead-detail.yaml');
    for (const page of [leads, detail]) {
      const forms = page.actions.filter((action: any) => action.type === 'server_form');
      expect(forms.some((action: any) => action.mutation?.guards?.some((guard: any) => String(guard.query || '').includes('base_contacts') && String(guard.query).includes('active = true')))).toBe(true);
    }
  });

  it('keeps the displayed customer name authoritative for linked contacts', () => {
    const leads = yaml('pages/leads.yaml');
    const detail = yaml('pages/lead-detail.yaml');
    for (const page of [leads, detail]) {
      const id = page === leads ? 'edit_lead' : 'edit_lead_detail';
      const contactGuard = (action(page, id).mutation?.guards || []).find((guard: any) => String(guard.query || '').includes('THEN :partner_name'));
      expect(contactGuard).toMatchObject({ assign: true });
      expect(String(contactGuard.query)).toContain('FROM base_contacts');
    }
  });

  it('provides a guarded assign-to-me action on CRM list and detail views', () => {
    const leads = yaml('pages/leads.yaml');
    const detail = yaml('pages/lead-detail.yaml');
    expect(leads.actions.find((action: any) => action.id === 'assign_lead_to_me')).toMatchObject({ action: 'crm.leads.assign_to_me', permission: 'crm.write' });
    expect(detail.actions.find((action: any) => action.id === 'assign_lead_detail_to_me')).toMatchObject({ action: 'crm.leads.assign_to_me', permission: 'crm.write' });
    const assign = leads.actions.find((action: any) => action.id === 'assign_lead_to_me');
    expect(String(assign.mutation.steps[0].query)).toContain(':current_user_name');
    expect(String(assign.mutation.guards[1].query)).toContain('crm_teams');
  });

  it('declares guarded batch assignment for unassigned leads', () => {
    const page = yaml('pages/unassigned-leads.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const assign = action(page, 'assign_selected_leads');
    expect(list.bulk_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'assign_selected_leads', permission: 'crm.write' }),
    ]));
    expect(String(assign.mutation.guards[0].query)).toContain("stage NOT IN ('Won', 'Lost')");
    expect(String(assign.mutation.guards[0].query)).toContain('salesperson');
  });

  it('keeps customer handoff available on every CRM customer list', () => {
    for (const file of ['leads.yaml', 'my-pipeline.yaml', 'unassigned-leads.yaml', 'unattended-leads.yaml', 'quality-leads.yaml', 'expected-revenue.yaml', 'lost-opportunities.yaml']) {
      const page = yaml(`pages/${file}`);
      const list = page.components.find((component: any) => component.type === 'ListView' && (component.columns || []).some((column: any) => column.field === 'partner_name'));
      expect(list?.actions).toEqual(expect.arrayContaining([
        expect.objectContaining({ permission: 'base.contacts.read' }),
      ]));
      expect(page.actions).toEqual(expect.arrayContaining([
        expect.objectContaining({ permission: 'base.contacts.read', navigate_to: '/contact-detail' }),
      ]));
    }
  });

  it('exposes the shared export action on the primary CRM lead list', () => {
    const list = yaml('pages/leads.yaml').components.find((component: any) => component.type === 'ListView');
    expect(list.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'crm.leads.export', label: 'Export' }),
    ]));
  });

  it('assigns open CRM records to the current user and protects closed records', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, stage VARCHAR, salesperson VARCHAR, team VARCHAR, row_version BIGINT DEFAULT 1, updated_at TIMESTAMP);
      CREATE TABLE crm_teams(name VARCHAR PRIMARY KEY, active BOOLEAN DEFAULT true);
      CREATE TABLE crm_team_members(id VARCHAR PRIMARY KEY, team_id VARCHAR, user_name VARCHAR, active BOOLEAN DEFAULT true);
      INSERT INTO crm_teams VALUES ('Enterprise', true);
      INSERT INTO crm_leads(id, stage, team) VALUES ('open-assign', 'New', 'Enterprise'), ('closed-assign', 'Won', 'Enterprise');
    `);
    const mutation = action(yaml('pages/leads.yaml'), 'assign_lead_to_me').mutation;
    await repository.executeMutation(mutation, { id: 'open-assign', current_user_name: 'Sales User' });
    expect((await repository.query('SELECT salesperson, row_version FROM crm_leads WHERE id = ?', ['open-assign']))[0]).toMatchObject({ salesperson: 'Sales User', row_version: 2 });
    await expect(repository.executeMutation(mutation, { id: 'closed-assign', current_user_name: 'Sales User' })).rejects.toThrow('Closed opportunities cannot be assigned');
  });

  it('applies deterministic assignment rules only to matching open leads', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, source VARCHAR, type VARCHAR, priority INTEGER, team VARCHAR, stage VARCHAR, salesperson VARCHAR, active BOOLEAN DEFAULT true, row_version BIGINT DEFAULT 1, updated_at TIMESTAMP);
      CREATE TABLE crm_assignment_rules(id VARCHAR PRIMARY KEY, sequence INTEGER, field VARCHAR, operator VARCHAR, comparison_value VARCHAR, team_id VARCHAR, user_name VARCHAR, active BOOLEAN DEFAULT true);
      CREATE TABLE crm_team_members(id VARCHAR PRIMARY KEY, team_id VARCHAR, user_name VARCHAR, active BOOLEAN DEFAULT true);
      CREATE TABLE crm_teams(id VARCHAR PRIMARY KEY, name VARCHAR, active BOOLEAN DEFAULT true);
      CREATE TABLE crm_activities(id VARCHAR PRIMARY KEY, lead_id VARCHAR, activity_type VARCHAR, summary VARCHAR, state VARCHAR, completed_at TIMESTAMP, created_by VARCHAR);
      INSERT INTO crm_teams VALUES ('team-1', 'Enterprise', true);
      INSERT INTO crm_team_members VALUES ('member-1', 'team-1', 'Alice', true);
      INSERT INTO crm_assignment_rules VALUES ('rule-1', 1, 'source', 'equals', 'Website', 'team-1', 'Alice', true);
      INSERT INTO crm_leads(id, source, team, stage) VALUES ('rule-match', 'Website', 'Enterprise', 'New'), ('rule-miss', 'Referral', 'Enterprise', 'New'), ('rule-closed', 'Website', 'Enterprise', 'Won');
    `);
    const mutation = action(yaml('pages/unassigned-leads.yaml'), 'apply_assignment_rules').mutation;
    await repository.executeMutation(mutation, { selectedIds: ['rule-match', 'rule-miss'] });
    expect((await repository.query('SELECT id, salesperson, row_version FROM crm_leads ORDER BY id'))).toEqual([
      { id: 'rule-closed', salesperson: null, row_version: 1 },
      { id: 'rule-match', salesperson: 'Alice', row_version: 2 },
      { id: 'rule-miss', salesperson: null, row_version: 1 },
    ]);
    expect((await repository.query("SELECT lead_id, activity_type, created_by FROM crm_activities"))[0]).toMatchObject({ lead_id: 'rule-match', activity_type: 'assignment' });
  });

  it('exposes tags across CRM lead and tag surfaces', () => {
    const leads = yaml('pages/leads.yaml');
    expect(String(leads.datasources.find((source: any) => source.id === 'crm_leads').query)).toContain("tags ILIKE");
    for (const id of ['create_lead', 'edit_lead']) expect(action(leads, id).mutation.fields).toContain('tags');
    expect(action(leads, 'create_lead').fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'tags' })]));
    expect(leads.components.find((component: any) => component.type === 'ListView').columns).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'tags' })]));
    expect(yaml('pages/lead-detail.yaml').components.find((component: any) => component.type === 'OdooFormView').groups[0].fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'tags' })]));
    expect(yaml('pages/lead-detail.yaml').actions.find((candidate: any) => candidate.id === 'edit_lead_detail').mutation.fields).toContain('tags');
    expect(yaml('pages/tags.yaml').components[0].source).toBe('crm_tag_values');
  });

  it('applies every declared lead pipeline filter in the datasource query', () => {
    const query = String(yaml('pages/leads.yaml').datasources.find((source: any) => source.id === 'crm_leads').query);
    for (const field of ['stage', 'type', 'salesperson', 'team', 'source', 'utm_campaign']) {
      expect(query).toContain(`:${field} IS NULL OR ${field} = :${field}`);
    }
  });

  it('calculates configurable lead scores and grades deterministically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, crmRoot + '/migrations', undefined, 'crm_scoring_schema_migrations', ['schema', 'data']);
    await repository.run("INSERT INTO crm_scoring_rules(id, field, operator, points, active) VALUES ('rule-email', 'email', 'present', 40, true)");
    await repository.run("INSERT INTO crm_scoring_rules(id, field, operator, comparison_value, points, active) VALUES ('rule-type', 'type', 'equals', 'lead', 35, true)");
    await repository.run("INSERT INTO crm_leads(id, name, type, email, stage, active) VALUES ('scored-lead', 'Scored lead', 'lead', 'lead@example.test', 'New', true)");
    const query = String(yaml('pages/leads.yaml').datasources.find((source: any) => source.id === 'crm_leads').query).replaceAll(/:\w+/g, 'NULL');
    const scored = (await repository.query(query))[0];
    expect(scored).toMatchObject({ id: 'scored-lead', lead_score: 75, lead_grade: 'Hot' });
    await database.close();
  });

  it('declares Odoo-style CRM saved favorites for common pipeline slices', () => {
    const list = yaml('pages/leads.yaml').components.find((component: any) => component.type === 'ListView');
    expect(list.favorites).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'my_pipeline', label: 'Proposition Pipeline', group_by: 'stage' }),
      expect.objectContaining({ id: 'unassigned', label: 'Unassigned' }),
      expect.objectContaining({ id: 'open_leads', label: 'Open Leads', group_by: 'stage' }),
    ]));
  });

  it('filters the CRM activity queue by configured activity type', () => {
    const activities = yaml('pages/activities.yaml');
    const queue = String(activities.datasources.find((source: any) => source.id === 'crm_activity_queue').query);
    expect(queue).toContain(':activity_type');
    expect(queue).toContain(':assigned_to');
    expect(activities.components[0].filters).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'activity_type', options_source: 'crm_activity_type_lookup' }),
      expect.objectContaining({ field: 'assigned_to', options_source: 'crm_activity_assignee_lookup' }),
    ]));
  });

  it('applies the Quality Leads search to customer and contact fields', () => {
    const quality = yaml('pages/quality-leads.yaml');
    const query = String(quality.datasources.find((source: any) => source.id === 'crm_quality_leads').query);
    expect(query).toContain(':q');
    expect(query).toContain('partner_name ILIKE');
    expect(query).toContain('email ILIKE');
    expect(quality.components[0].search).toBeDefined();
  });

  it('exposes open lead counts on the sales team surface', () => {
    const teams = yaml('pages/teams.yaml');
    const query = String(teams.datasources.find((source: any) => source.id === 'crm_teams').query);
    expect(query).toContain('open_lead_count');
    expect(query).toContain("l.stage NOT IN ('Won', 'Lost')");
    expect(teams.components[0].columns).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'open_lead_count', label: 'Open leads' }),
    ]));
  });

  it('uses a stable composite key for CRM lead distribution rows', () => {
    const analysis = yaml('pages/analysis.yaml');
    const distribution = analysis.datasources.find((source: any) => source.id === 'crm_lead_distribution');
    expect(String(distribution.query)).toContain('distribution_key');
    expect(analysis.components.find((component: any) => component.source === 'crm_lead_distribution').row_key).toBe('distribution_key');
  });

  it('searches sales teams by team, leader, or email alias', () => {
    const teams = yaml('pages/teams.yaml');
    const query = String(teams.datasources.find((source: any) => source.id === 'crm_teams').query);
    expect(query).toContain(':q');
    expect(query).toContain('t.leader ILIKE');
    expect(query).toContain('t.email_alias ILIKE');
    expect(teams.components[0].search).toBeDefined();
  });

  it('enforces case-insensitive bounded sales-team names', () => {
    const page = yaml('pages/teams.yaml');
    for (const id of ['create_crm_team', 'edit_crm_team']) {
      const guards = action(page, id).mutation.guards;
      expect(guards.some((guard: any) => String(guard.query || '').includes('lower(name)') && String(guard.query).includes('BETWEEN 1 AND 80'))).toBe(true);
    }
  });

  it('uses configured team members for sales-team leader selection', () => {
    const page = yaml('pages/teams.yaml');
    expect(page.datasources.find((source: any) => source.id === 'crm_team_leader_lookup')?.query).toContain('crm_team_members');
    for (const id of ['create_crm_team', 'edit_crm_team']) {
      expect(action(page, id).fields).toEqual(expect.arrayContaining([
        expect.objectContaining({ field: 'leader', type: 'select', options_source: 'crm_team_leader_lookup' }),
      ]));
    }
  });

  it('exposes UTM attribution fields and campaign performance', () => {
    const leads = yaml('pages/leads.yaml');
    const detail = yaml('pages/lead-detail.yaml');
    for (const page of [leads, detail]) {
      const update = page.actions.find((candidate: any) => candidate.id === (page === leads ? 'edit_lead' : 'edit_lead_detail'));
      expect(update.mutation.fields).toEqual(expect.arrayContaining(['utm_campaign', 'utm_medium', 'utm_source']));
      expect(update.fields).toEqual(expect.arrayContaining([
        expect.objectContaining({ field: 'utm_campaign' }), expect.objectContaining({ field: 'utm_medium' }), expect.objectContaining({ field: 'utm_source' }),
      ]));
    }
    expect(String(yaml('pages/analysis.yaml').datasources.find((source: any) => source.id === 'crm_utm_campaign_performance').query)).toContain('utm_campaign');
  });

  it('declares a guarded activity-plan application workflow', () => {
    const detail = yaml('pages/lead-detail.yaml');
    const plan = detail.actions.find((candidate: any) => candidate.id === 'apply_activity_plan');
    expect(plan).toMatchObject({ action: 'crm.activities.apply_plan', permission: 'crm.write' });
    expect(String(plan.mutation.steps[0].query)).toContain('crm_activity_plan_steps');
    expect(plan.mutation.guards.some((guard: any) => String(guard.message || '').includes('active assignee'))).toBe(true);
    expect(plan.fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'plan_id', options_source: 'crm_activity_plans_detail' })]));
  });

  it('materializes active activity-plan steps in sequence with due dates and ownership', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, stage VARCHAR, salesperson VARCHAR);
      CREATE TABLE crm_team_members(user_name VARCHAR, active BOOLEAN);
      CREATE TABLE crm_activity_plans(id VARCHAR PRIMARY KEY, active BOOLEAN);
      CREATE TABLE crm_activity_plan_steps(
        id VARCHAR PRIMARY KEY, plan_id VARCHAR, sequence INTEGER, activity_type VARCHAR,
        summary VARCHAR, delay_days INTEGER, active BOOLEAN
      );
      CREATE TABLE crm_activities(
        id VARCHAR PRIMARY KEY, lead_id VARCHAR, activity_type VARCHAR, summary VARCHAR,
        due_date DATE, assigned_to VARCHAR, state VARCHAR, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO crm_team_members VALUES ('Alice', true);
      INSERT INTO crm_leads VALUES ('lead-plan', 'New', 'Alice');
      INSERT INTO crm_activity_plans VALUES ('plan-1', true);
      INSERT INTO crm_activity_plan_steps VALUES
        ('step-2', 'plan-1', 2, 'meeting', 'Review proposal', 7, true),
        ('step-1', 'plan-1', 1, 'call', 'Qualify opportunity', 2, true),
        ('step-off', 'plan-1', 3, 'email', 'Inactive step', 1, false);
    `);

    const plan = action(yaml('pages/lead-detail.yaml'), 'apply_activity_plan');
    await repository.executeMutation(plan.mutation, { lead_id: 'lead-plan', plan_id: 'plan-1' });
    const activities = await repository.query(`SELECT activity_type, summary, due_date, assigned_to, state FROM crm_activities WHERE lead_id = 'lead-plan' ORDER BY due_date`);
    expect(activities).toHaveLength(2);
    expect(activities.map((activity: any) => activity.activity_type)).toEqual(['call', 'meeting']);
    expect(activities.map((activity: any) => activity.summary)).toEqual(['Qualify opportunity', 'Review proposal']);
    expect(activities.every((activity: any) => activity.assigned_to === 'Alice' && activity.state === 'planned')).toBe(true);
  });

  it('exposes activity-plan administration in CRM configuration and AI', () => {
    const config = yaml('pages/configuration.yaml');
    const ids = config.datasources.map((source: any) => source.id);
    expect(ids).toContain('crm_activity_plan_configuration');
    expect(config.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'create_crm_activity_plan', action: 'crm.activity_plans.create' }),
      expect.objectContaining({ id: 'toggle_crm_activity_plan', action: 'crm.activity_plans.toggle' }),
    ]));
    expect(yaml('pages/lead-detail.yaml').datasources.map((source: any) => source.id)).toContain('crm_activity_plans_detail');
    expect(ids).toContain('crm_activity_plan_steps_configuration');
    expect(config.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'create_crm_activity_plan_step', action: 'crm.activity_plan_steps.create' }),
      expect.objectContaining({ id: 'toggle_crm_activity_plan_step', action: 'crm.activity_plan_steps.toggle' }),
    ]));
  });

  it('aggregates comma-separated lead tags for the tag surface', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run("CREATE TABLE crm_leads(tags VARCHAR, active BOOLEAN DEFAULT true); INSERT INTO crm_leads(tags) VALUES ('urgent, enterprise'), ('enterprise'), (NULL)");
    const query = String(yaml('pages/tags.yaml').datasources[0].query);
    const positionalQuery = query.replaceAll(':q', '?');
    expect(await repository.query(positionalQuery, [null, null])).toEqual([
      { value: 'enterprise', label: 'enterprise', lead_count: 2 },
      { value: 'urgent', label: 'urgent', lead_count: 1 },
    ]);
    expect(await repository.query(positionalQuery, ['urg', 'urg'])).toEqual([
      { value: 'urgent', label: 'urgent', lead_count: 1 },
    ]);
  });

  it('creates and archives managed CRM tags through guarded actions', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run('CREATE TABLE crm_tags(id VARCHAR PRIMARY KEY, name VARCHAR, color INTEGER, active BOOLEAN);');
    const tags = yaml('pages/tags.yaml');
    const created = await repository.executeMutation(action(tags, 'create_crm_tag').mutation, { name: 'Priority', color: 4, active: true });
    expect(created).toMatchObject({ name: 'Priority', color: 4, active: true });
    await expect(repository.executeMutation(action(tags, 'create_crm_tag').mutation, { name: 'priority', color: 2, active: true })).rejects.toMatchObject({ status: 409 });
    const toggled = await repository.executeMutation(action(tags, 'toggle_crm_tag').mutation, { id: created.id });
    expect(toggled).toMatchObject({ id: created.id, active: false });
  });

  it('validates CRM stage probability on create and edit', () => {
    const page = yaml('pages/configuration.yaml');
    for (const id of ['create_crm_stage', 'edit_crm_stage']) {
      const candidate = action(page, id);
      expect((candidate.mutation?.guards || []).some((guard: any) => String(guard.message || '').includes('probability'))).toBe(true);
    }
  });

  it('keeps probability invariants explicit across every CRM workflow path', () => {
    const workflow = yaml('pages/lead-workflow.yaml').workflow;
    const source = JSON.stringify(workflow);
    expect(source).toContain('target_status');
    expect(source).toContain("stage = 'Qualified', probability = COALESCE");
    expect(source).toContain("stage = 'Won', probability = 100");
    expect(source).toContain("stage = 'Lost', lost_reason = :lost_reason, probability = 0");
    expect(source).toContain("stage = 'New', lost_reason = NULL, probability = 10");
  });

  it('enforces team-scoped stage transitions without blocking global stages', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, stage VARCHAR, team VARCHAR, probability INTEGER, row_version INTEGER DEFAULT 1, updated_at TIMESTAMP); CREATE TABLE crm_stages(id VARCHAR PRIMARY KEY, name VARCHAR, probability INTEGER, active BOOLEAN); CREATE TABLE crm_teams(id VARCHAR PRIMARY KEY, name VARCHAR, active BOOLEAN); CREATE TABLE crm_stage_teams(stage_id VARCHAR, team_id VARCHAR); CREATE TABLE crm_activities(id VARCHAR, lead_id VARCHAR, activity_type VARCHAR, summary VARCHAR, state VARCHAR, completed_at TIMESTAMP); INSERT INTO crm_leads VALUES ('scope-1', 'New', 'Enterprise', 10, 1, CURRENT_TIMESTAMP); INSERT INTO crm_stages VALUES ('stage-qualified', 'Qualified', 40, true), ('stage-proposal', 'Proposition', 60, true); INSERT INTO crm_teams VALUES ('team-enterprise', 'Enterprise', true), ('team-other', 'Other', true); INSERT INTO crm_stage_teams VALUES ('stage-qualified', 'team-enterprise'), ('stage-proposal', 'team-other');`);
    const mutation = yaml('pages/lead-workflow.yaml').workflow.default_mutation;
    await expect(repository.executeMutation(mutation, { id: 'scope-1', current_status: 'New', target_status: 'Proposition' })).rejects.toThrow('This stage is not available for the opportunity sales team');
    const result = await repository.executeMutation(mutation, { id: 'scope-1', current_status: 'New', target_status: 'Qualified' });
    expect(result).toMatchObject({ stage: 'Qualified', probability: 40 });
  });

  it('exposes recurring opportunity fields with a non-negative guard', () => {
    const page = yaml('pages/lead-detail.yaml');
    const candidate = action(page, 'edit_lead_detail');
    expect(candidate.mutation.fields).toEqual(expect.arrayContaining(['recurring_revenue', 'recurring_plan']));
    expect((candidate.mutation.guards || []).some((guard: any) => String(guard.message || '').includes('Recurring revenue cannot be negative'))).toBe(true);
    const detail = page.datasources.find((source: any) => source.id === 'crm_lead_detail');
    expect(String(detail.query)).toContain('recurring_revenue');
  });

  it('enforces case-insensitive bounded lost-reason names', () => {
    const page = yaml('pages/configuration.yaml');
    const candidate = action(page, 'create_crm_lost_reason');
    expect(String(candidate.mutation.guards[0].query)).toContain('lower(name)');
    expect(String(candidate.mutation.guards[0].query)).toContain('BETWEEN 1 AND 80');
  });

  it('provides the lead-source create action advertised by CRM configuration', () => {
    const page = yaml('pages/configuration.yaml');
    const component = page.components.find((candidate: any) => candidate.source === 'crm_source_configuration');
    const candidate = action(page, 'create_crm_source');
    expect(component.create_action).toBe('create_crm_source');
    expect(candidate).toMatchObject({ action: 'crm.sources.create', permission: 'crm.manage' });
    expect(String(candidate.mutation.guards[0].query)).toContain('lower(name)');
    expect(String(candidate.mutation.guards[0].query)).toContain('BETWEEN 1 AND 80');
  });

  it('provides guarded lead-source editing in CRM configuration', () => {
    const page = yaml('pages/configuration.yaml');
    const component = page.components.find((candidate: any) => candidate.source === 'crm_source_configuration');
    const candidate = action(page, 'edit_crm_source');
    expect(component.actions).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'edit_crm_source' })]));
    expect(candidate).toMatchObject({ action: 'crm.sources.update', prefill: 'row', permission: 'crm.manage' });
    expect(String(candidate.mutation.guards[1].query)).toContain('lower(name)');
    expect(String(candidate.mutation.guards[1].query)).toContain('BETWEEN 1 AND 80');
  });

  it('provides guarded lost-reason editing in CRM configuration', () => {
    const page = yaml('pages/configuration.yaml');
    const component = page.components.find((candidate: any) => candidate.source === 'crm_lost_reason_configuration');
    const candidate = action(page, 'edit_crm_lost_reason');
    expect(component.actions).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'edit_crm_lost_reason' })]));
    expect(candidate).toMatchObject({ action: 'crm.lost_reasons.update', prefill: 'row', permission: 'crm.manage' });
    expect(String(candidate.mutation.guards[1].query)).toContain('lower(name)');
    expect(String(candidate.mutation.guards[1].query)).toContain('BETWEEN 1 AND 80');
  });

  it('enforces case-insensitive bounded activity-type names', () => {
    const candidate = action(yaml('pages/configuration.yaml'), 'create_crm_activity_type');
    expect(String(candidate.mutation.guards[0].query)).toContain('lower(name)');
    expect(String(candidate.mutation.guards[0].query)).toContain('BETWEEN 1 AND 80');
  });

  it('provides guarded activity-plan editing in CRM configuration', () => {
    const page = yaml('pages/configuration.yaml');
    const component = page.components.find((candidate: any) => candidate.source === 'crm_activity_plan_configuration');
    const candidate = action(page, 'edit_crm_activity_plan');
    expect(component.actions).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'edit_crm_activity_plan' })]));
    expect(candidate).toMatchObject({ action: 'crm.activity_plans.update', prefill: 'row', permission: 'crm.manage' });
    expect(String(candidate.mutation.guards[1].query)).toContain('lower(name)');
    expect(String(candidate.mutation.guards[1].query)).toContain('BETWEEN 1 AND 80');
  });

  it('enforces case-insensitive bounded activity-plan names on create', () => {
    const candidate = action(yaml('pages/configuration.yaml'), 'create_crm_activity_plan');
    expect(String(candidate.mutation.guards[0].query)).toContain('lower(name)');
    expect(String(candidate.mutation.guards[0].query)).toContain('BETWEEN 1 AND 80');
  });

  it('provides guarded activity-plan-step editing in CRM configuration', () => {
    const page = yaml('pages/configuration.yaml');
    const component = page.components.find((candidate: any) => candidate.source === 'crm_activity_plan_steps_configuration');
    const candidate = action(page, 'edit_crm_activity_plan_step');
    expect(component.actions).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'edit_crm_activity_plan_step' })]));
    expect(candidate).toMatchObject({ action: 'crm.activity_plan_steps.update', prefill: 'row', permission: 'crm.manage' });
    expect(candidate.mutation.fields).toEqual(expect.arrayContaining(['plan_id', 'sequence', 'activity_type', 'delay_days']));
    expect(candidate.mutation.guards).toHaveLength(4);
    expect(String(candidate.mutation.guards[3].query)).toContain('delay_days');
  });

  it('provides guarded activity-type editing in CRM configuration', () => {
    const page = yaml('pages/configuration.yaml');
    const component = page.components.find((candidate: any) => candidate.source === 'crm_activity_type_configuration');
    const candidate = action(page, 'edit_crm_activity_type');
    expect(component.actions).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'edit_crm_activity_type' })]));
    expect(candidate).toMatchObject({ action: 'crm.activity_types.update', prefill: 'row', permission: 'crm.manage' });
    expect(String(candidate.mutation.guards[1].query)).toContain('lower(name)');
    expect(String(candidate.mutation.guards[1].query)).toContain('BETWEEN 1 AND 80');
  });

  it('records activity history for custom CRM stage transitions', () => {
    const workflow = yaml('pages/lead-workflow.yaml').workflow;
    for (const id of ['qualify', 'won', 'lost']) {
      const transition = workflow.transitions.find((candidate: any) => candidate.id === id);
      expect(transition.mutation.steps.some((step: any) => String(step.query || step).includes("crm_activities") && String(step.query || step).includes('stage_change'))).toBe(true);
    }
  });

  it('edits a CRM stage and propagates its name and probability to leads', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_stages(id VARCHAR PRIMARY KEY, name VARCHAR, sequence INTEGER, probability INTEGER, fold BOOLEAN, requirements VARCHAR);
      CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, stage VARCHAR, probability INTEGER, row_version BIGINT, updated_at TIMESTAMP);
      INSERT INTO crm_stages VALUES ('stage-1', 'Qualified', 20, 40, false, 'Contact confirmed');
      INSERT INTO crm_leads VALUES ('lead-stage-1', 'Qualified', 10, 1, CURRENT_TIMESTAMP);
    `);
    const stage = action(yaml('pages/configuration.yaml'), 'edit_crm_stage');
    const updated = await repository.executeMutation(stage.mutation, {
      id: 'stage-1', name: 'Validated', sequence: 25, probability: 60, fold: true, requirements: 'Budget confirmed',
    });
    expect(updated).toMatchObject({ name: 'Validated', sequence: 25, probability: 60, fold: true });
    expect((await repository.query("SELECT stage, probability, row_version FROM crm_leads WHERE id = 'lead-stage-1'"))[0]).toMatchObject({ stage: 'Validated', probability: 60, row_version: 2 });
  });

  it('restores selected lost opportunities and records each restoration', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, stage VARCHAR, lost_reason VARCHAR, probability INTEGER, row_version BIGINT DEFAULT 1, expected_revenue INTEGER, updated_at TIMESTAMP);
      CREATE TABLE crm_stages(id VARCHAR PRIMARY KEY, name VARCHAR, probability INTEGER, active BOOLEAN);
      CREATE TABLE crm_activities(id VARCHAR PRIMARY KEY, lead_id VARCHAR, activity_type VARCHAR, summary VARCHAR, state VARCHAR, completed_at TIMESTAMP);
      INSERT INTO crm_stages VALUES ('stage-new', 'New', 15, true);
      INSERT INTO crm_leads(id, stage, lost_reason, probability) VALUES ('lost-a', 'Lost', 'budget', 0), ('lost-b', 'Lost', 'timing', 0), ('won-a', 'Won', NULL, 100);
    `);
    const restore = action(yaml('pages/lost-opportunities.yaml'), 'restore_lost_opportunities');
    await repository.executeMutation(restore.mutation, { selectedIds: ['lost-a', 'lost-b'] });
    expect(await repository.query("SELECT id, stage, lost_reason, probability, row_version FROM crm_leads ORDER BY id")).toEqual([
      { id: 'lost-a', stage: 'New', lost_reason: null, probability: 15, row_version: 2 },
      { id: 'lost-b', stage: 'New', lost_reason: null, probability: 15, row_version: 2 },
      { id: 'won-a', stage: 'Won', lost_reason: null, probability: 100, row_version: 1 },
    ]);
    expect((await repository.query("SELECT COUNT(*) AS count FROM crm_activities WHERE summary = 'Opportunity restored'"))[0].count).toBe(2);
  });

  it('makes CRM workflows explicit in the AI Workspace entry point', () => {
    const ai = aiYaml('pages/ai.yaml');
    const workspace = ai.components.find((component: any) => component.type === 'AiWorkspace');
    expect(workspace.suggestions).toEqual(expect.arrayContaining([
      'Review the CRM pipeline',
      'Find unattended CRM leads',
      'Prepare a new CRM lead',
      'Merge duplicate CRM leads',
      'Schedule a CRM follow-up',
      'Analyze expected CRM revenue',
      'Review lost CRM opportunities',
      'Audit CRM lead quality',
    ]));
    expect(workspace.description).toContain('Odoo-style CRM');
    expect(workspace.context_value).toBe('core3 CRM workspace');
  });

  it('publishes declared CRM operations to the permissioned AI agent catalog', async () => {
    let generated: any;
    const api = createAiAgentApi({
      appsRoot: join(import.meta.dir, '../'),
      authProvider: {
        async getCurrentUser() { return { id: 'user-1', permissions: ['ai.write', 'crm.read', 'crm.write'] }; },
        hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
      },
      provider: { async generate(input: any) { generated = input; return { parts: [] }; } },
      invoke: async () => null,
    });
    const response = await api(new Request('http://localhost/api/ai/agent', {
      method: 'POST', body: JSON.stringify({ prompt: 'Review CRM' }),
    }), new URL('http://localhost/api/ai/agent'));
    expect(response?.status).toBe(200);
    expect(generated.operations).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'datasource.crm_leads.query', permission: 'crm.read', read_only: true }),
      expect.objectContaining({ id: 'crm.leads.convert', permission: 'crm.write' }),
    ]));
    expect(generated.operations.find((operation: any) => operation.id === 'crm.leads.convert').route)
      .toBe('/api/actions/crm.leads.convert');
    expect(generated.yaml_context.map((entry: any) => entry.path)).toEqual(expect.arrayContaining([
      'services/ai/agent.yaml',
      'services/ai/permissions.yaml',
    ]));
    const agent = Bun.YAML.parse(readFileSync(join(import.meta.dir, '../services/ai/agent.yaml'), 'utf8')) as any;
    expect(agent.context_paths).toEqual(expect.arrayContaining([
      'services/ai/agent.yaml', 'services/ai/permissions.yaml',
    ]));
    expect(agent.operations.map((operation: any) => operation.id)).toEqual(expect.arrayContaining([
      'datasource.crm_leads.query', 'crm.leads.convert', 'crm.leads.merge',
      'crm.activities.create', 'orders.quotation.create',
      'crm.leads.create', 'crm.leads.update', 'crm.leads.qualify', 'crm.leads.propose',
      'crm.leads.won', 'crm.leads.lost', 'crm.leads.reopen', 'crm.activities.complete',
      'crm.teams.create', 'crm.teams.update', 'crm.teams.archive', 'crm.sources.create',
      'crm.sources.toggle', 'crm.lost_reasons.create', 'crm.lost_reasons.toggle',
      'crm.activity_types.create', 'crm.activity_types.toggle',
      'crm.stages.create',
    ]));
  });

  it('requires explicit confirmation before an AI CRM mutation executes', async () => {
    let invoked = false;
    const api = createAiAgentApi({
      appsRoot: join(import.meta.dir, '../'),
      authProvider: {
        async getCurrentUser() { return { id: 'user-1', permissions: ['ai.write', 'crm.write'] }; },
        hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
      },
      provider: { async generate() { return { parts: [], calls: [{ operation: 'crm.leads.convert', values: { id: 'lead-1' } }] }; } },
      invoke: async () => { invoked = true; return new Response('{}', { status: 200 }); },
    });
    const response = await api(new Request('http://localhost/api/ai/agent', {
      method: 'POST', body: JSON.stringify({ prompt: 'Convert lead-1' }),
    }), new URL('http://localhost/api/ai/agent'));
    const body = await response?.json();
    expect(response?.status).toBe(200);
    expect(body.parts).toEqual([expect.objectContaining({ type: 'approval' })]);
    expect(invoked).toBe(false);
  });

  it('surfaces downstream mutation failures during AI confirmation', async () => {
    const api = createAiAgentApi({
      appsRoot: join(import.meta.dir, '../'),
      authProvider: {
        async getCurrentUser() { return { id: 'user-2', permissions: ['ai.write', 'crm.write'] }; },
        hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
      },
      provider: { async generate() { return { parts: [], calls: [{ operation: 'crm.leads.convert', values: { id: 'lead-2' } }] }; } },
      invoke: async () => new Response(JSON.stringify({ error: 'Lead is already closed', code: 'LEAD_CLOSED' }), { status: 409 }),
    });
    const preview = await api(new Request('http://localhost/api/ai/agent', {
      method: 'POST', body: JSON.stringify({ prompt: 'Convert lead-2' }),
    }), new URL('http://localhost/api/ai/agent'));
    const previewBody = await preview?.json();
    const confirmation = await api(new Request('http://localhost/api/ai/agent/confirm', {
      method: 'POST', body: JSON.stringify({ preview_id: previewBody.parts[0].preview_id }),
    }), new URL('http://localhost/api/ai/agent/confirm'));
    expect(confirmation?.status).toBe(409);
    expect(await confirmation?.json()).toMatchObject({ code: 'LEAD_CLOSED' });
  });

  it('hides contact-creating CRM conversion from users without contact-write permission', async () => {
    let generated: any;
    const api = createAiAgentApi({
      appsRoot: join(import.meta.dir, '../'),
      authProvider: {
        async getCurrentUser() { return { id: 'crm-only', permissions: ['ai.write', 'crm.write'] }; },
        hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
      },
      provider: { async generate(input: any) { generated = input; return { parts: [] }; } },
      invoke: async () => new Response('{}', { status: 200 }),
    });
    await api(new Request('http://localhost/api/ai/agent', {
      method: 'POST', body: JSON.stringify({ prompt: 'Convert this lead and create a customer' }),
    }), new URL('http://localhost/api/ai/agent'));
    expect(generated.operations.some((operation: any) => operation.id === 'crm.leads.convert_create_contact')).toBe(false);
  });

  it('filters CRM mutations from the AI catalog when the user lacks CRM write permission', async () => {
    let generated: any;
    const api = createAiAgentApi({
      appsRoot: join(import.meta.dir, '../'),
      authProvider: {
        async getCurrentUser() { return { id: 'reader-1', permissions: ['ai.write', 'crm.read'] }; },
        hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
      },
      provider: { async generate(input: any) { generated = input; return { parts: [] }; } },
      invoke: async () => new Response('{}', { status: 200 }),
    });
    const response = await api(new Request('http://localhost/api/ai/agent', {
      method: 'POST', body: JSON.stringify({ prompt: 'Review CRM' }),
    }), new URL('http://localhost/api/ai/agent'));
    expect(response?.status).toBe(200);
    expect(generated.operations.some((operation: any) => operation.id === 'crm.leads.convert')).toBe(false);
    expect(generated.operations).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'datasource.crm_leads.query', permission: 'crm.read' }),
    ]));
  });

  it('keeps every declared CRM named action represented in the AI allowlist', () => {
    const agent = Bun.YAML.parse(readFileSync(join(import.meta.dir, '../services/ai/agent.yaml'), 'utf8')) as any;
    const allowed = new Set((agent.operations || []).map((operation: any) => String(operation.id)));
    const declared = new Set<string>();
    for (const file of readdirSync(join(crmRoot, 'pages')).filter((entry) => entry.endsWith('.yaml'))) {
      const page = Bun.YAML.parse(readFileSync(join(crmRoot, 'pages', file), 'utf8')) as any;
      for (const operation of page.actions || []) {
        if (operation.action && ['server', 'server_form'].includes(operation.type)) declared.add(String(operation.action));
      }
    }
    expect([...declared].filter((id) => id.startsWith('crm.')).filter((id) => !allowed.has(id))).toEqual([]);
  });

  it('uses the configured CRM tag catalog for lead editing', () => {
    const leads = yaml('pages/leads.yaml');
    const detail = yaml('pages/lead-detail.yaml');
    expect(leads.datasources.find((source: any) => source.id === 'crm_tag_lookup')?.query).toContain('FROM crm_tags');
    expect(detail.datasources.find((source: any) => source.id === 'crm_tag_lookup_detail')?.query).toContain('FROM crm_tags');
    for (const page of [leads, detail]) {
      const forms = (page.actions || []).filter((candidate: any) => ['create_lead', 'edit_lead', 'edit_lead_detail'].includes(candidate.id));
      for (const form of forms) {
        const tags = (form.fields || []).find((field: any) => field.field === 'tags');
        expect(tags).toMatchObject({ type: 'multi-select', multiple: true });
        expect(String(tags.options_source)).toMatch(/^crm_tag_lookup/);
      }
    }
  });

  it('exposes opportunity chatter through the shared form component', () => {
    const page = yaml('pages/lead-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    expect(form).toMatchObject({ message_source: 'crm_lead_chatter', message_action: 'send_lead_message', note_action: 'log_lead_note' });
    expect(page.datasources.find((source: any) => source.id === 'crm_lead_chatter')?.query).toContain('created_by');
    expect(page.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'send_lead_message', action: 'crm.leads.message', permission: 'crm.write' }),
      expect.objectContaining({ id: 'log_lead_note', action: 'crm.leads.note', permission: 'crm.write' }),
    ]));
    for (const id of ['send_lead_message', 'log_lead_note']) {
      expect(action(page, id).mutation.guards.some((guard: any) => String(guard.query || '').includes('FROM crm_leads'))).toBe(true);
      expect(action(page, id).mutation.guards.some((guard: any) => String(guard.query || '').includes('4000'))).toBe(true);
      expect(action(page, id).mutation.steps.some((step: any) => String(step.query || step).includes(':current_user_name'))).toBe(true);
    }
  });

  it('persists authored CRM chatter and rejects stale opportunities', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, name VARCHAR, partner_id VARCHAR, partner_name VARCHAR, salesperson VARCHAR);
      CREATE TABLE crm_activities(id VARCHAR PRIMARY KEY, lead_id VARCHAR, activity_type VARCHAR, summary VARCHAR, state VARCHAR, assigned_to VARCHAR, created_by VARCHAR, delivery_status VARCHAR, delivery_attempts INTEGER);
      CREATE TABLE crm_email_templates(id VARCHAR PRIMARY KEY, body VARCHAR, active BOOLEAN);
      CREATE TABLE crm_contact_preferences(contact_id VARCHAR PRIMARY KEY, allow_email BOOLEAN, allow_phone BOOLEAN);
      INSERT INTO crm_leads(id, name, partner_name, salesperson) VALUES ('lead-chat', 'Chat lead', 'Customer', 'Sales User');
    `);
    const message = action(yaml('pages/lead-detail.yaml'), 'send_lead_message').mutation;
    const created = await repository.executeMutation(message, { lead_id: 'lead-chat', summary: 'Customer replied', current_user_name: 'Sales User' });
    expect(created).toMatchObject({ lead_id: 'lead-chat', activity_type: 'message', summary: 'Customer replied', created_by: 'Sales User' });
    await expect(repository.executeMutation(message, { lead_id: 'missing-chat', summary: 'Should fail', current_user_name: 'Sales User' })).rejects.toThrow('Opportunity no longer exists');
  });

  it('declares and persists guarded opportunity followers', async () => {
    const page = yaml('pages/lead-detail.yaml');
    const form = page.components.find((component: any) => component.type === 'OdooFormView');
    expect(form).toMatchObject({
      follower_source: 'crm_lead_followers',
      follower_candidates_source: 'crm_lead_follower_candidates',
      follower_add_action: 'add_lead_follower',
      follower_remove_action: 'remove_lead_follower',
    });
    expect(page.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'add_lead_follower', action: 'crm.leads.followers.add', permission: 'crm.write' }),
      expect.objectContaining({ id: 'remove_lead_follower', action: 'crm.leads.followers.remove', permission: 'crm.write' }),
    ]));

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY);
      CREATE TABLE crm_team_members(user_name VARCHAR PRIMARY KEY, active BOOLEAN);
      CREATE TABLE crm_lead_followers(lead_id VARCHAR, user_name VARCHAR, added_by VARCHAR, PRIMARY KEY (lead_id, user_name));
      INSERT INTO crm_leads VALUES ('lead-follow');
      INSERT INTO crm_team_members VALUES ('Follower User', true);
    `);
    const add = await repository.executeMutation(action(page, 'add_lead_follower').mutation, {
      lead_id: 'lead-follow', user_name: 'Follower User', current_user_name: 'Sales User',
    });
    expect(add).toMatchObject({ user_id: 'Follower User', removed: false });
    expect((await repository.query('SELECT added_by FROM crm_lead_followers WHERE lead_id = ?', ['lead-follow']))[0]).toMatchObject({ added_by: 'Sales User' });
    const remove = await repository.executeMutation(action(page, 'remove_lead_follower').mutation, {
      lead_id: 'lead-follow', user_name: 'Follower User',
    });
    expect(remove).toMatchObject({ user_id: 'Follower User', removed: true });
    await expect(repository.executeMutation(action(page, 'add_lead_follower').mutation, {
      lead_id: 'missing-follow', user_name: 'Follower User', current_user_name: 'Sales User',
    })).rejects.toThrow('Opportunity no longer exists');
  });

  it('archives active leads and restores them from the archived surface', async () => {
    const page = yaml('pages/leads.yaml');
    const archived = yaml('pages/archived-leads.yaml');
    expect(page.datasources.find((source: any) => source.id === 'crm_leads')?.query).toContain('active = true');
    expect(archived.datasources.find((source: any) => source.id === 'crm_archived_leads')?.query).toContain('active = false');
    expect(action(page, 'archive_lead')).toMatchObject({ action: 'crm.leads.archive', permission: 'crm.write' });
    expect(action(archived, 'unarchive_lead')).toMatchObject({ action: 'crm.leads.unarchive', permission: 'crm.write' });

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, name VARCHAR, stage VARCHAR, active BOOLEAN, row_version BIGINT DEFAULT 1, updated_at TIMESTAMP); INSERT INTO crm_leads VALUES ('archive-1', 'Archive me', 'Proposition', true, 1, CURRENT_TIMESTAMP), ('closed-1', 'Closed', 'Won', true, 1, CURRENT_TIMESTAMP);`);
    const archivedResult = await repository.executeMutation(action(page, 'archive_lead').mutation, { id: 'archive-1' });
    expect(archivedResult).toMatchObject({ id: 'archive-1', active: false, row_version: 2 });
    await expect(repository.executeMutation(action(page, 'archive_lead').mutation, { id: 'closed-1' })).rejects.toThrow('Only open active leads can be archived');
    const restored = await repository.executeMutation(action(archived, 'unarchive_lead').mutation, { id: 'archive-1' });
    expect(restored).toMatchObject({ id: 'archive-1', active: true, row_version: 3 });
  });

  it('guards bulk lead updates and exposes a read-only duplicate preview', async () => {
    const page = yaml('pages/leads.yaml');
    const duplicatePage = yaml('pages/duplicate-leads.yaml');
    expect(page.datasources.find((source: any) => source.id === 'crm_duplicate_preview')?.query).toContain('HAVING COUNT(*) > 1');
    expect(duplicatePage.datasources[0].query).toContain('HAVING COUNT(*) > 1');
    expect(duplicatePage.actions.some((candidate: any) => candidate.type === 'server')).toBe(false);

    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, name VARCHAR, partner_name VARCHAR, email VARCHAR, stage VARCHAR, probability INTEGER, salesperson VARCHAR, active BOOLEAN, row_version BIGINT DEFAULT 1, updated_at TIMESTAMP);
      CREATE TABLE crm_stages(name VARCHAR PRIMARY KEY, probability INTEGER, active BOOLEAN);
      CREATE TABLE crm_team_members(user_name VARCHAR PRIMARY KEY, active BOOLEAN);
      INSERT INTO crm_stages VALUES ('Qualified', 40, true);
      INSERT INTO crm_team_members VALUES ('New Owner', true);
      INSERT INTO crm_leads VALUES ('bulk-1', 'One', 'Same Customer', 'same@example.test', 'New', 10, 'Old Owner', true, 1, CURRENT_TIMESTAMP), ('bulk-2', 'Two', 'Same Customer', 'same@example.test', 'New', 10, 'Old Owner', true, 1, CURRENT_TIMESTAMP), ('bulk-closed', 'Closed', 'Closed', 'closed@example.test', 'Won', 100, 'Old Owner', true, 1, CURRENT_TIMESTAMP);
    `);
    const mutation = action(page, 'bulk_update_leads').mutation;
    const updated = await repository.executeMutation(mutation, { selectedIds: ['bulk-1', 'bulk-2'], stage: 'Qualified', salesperson: 'New Owner' });
    expect(updated).toMatchObject({ id: 'bulk-1', stage: 'Qualified', salesperson: 'New Owner', probability: 40, row_version: 2 });
    expect((await repository.query("SELECT COUNT(*) AS count FROM crm_leads WHERE stage = 'Qualified' AND salesperson = 'New Owner'"))[0].count).toBe(2);
    await expect(repository.executeMutation(mutation, { selectedIds: ['bulk-1', 'bulk-closed'], stage: 'Qualified', salesperson: 'New Owner' })).rejects.toThrow('Select only active open leads');
  });

  it('restricts CRM activity assignees to configured team members', () => {
    const queue = yaml('pages/activities.yaml');
    const detail = yaml('pages/lead-detail.yaml');
    expect(queue.datasources.find((source: any) => source.id === 'crm_activity_assignee_lookup')?.query).toContain('crm_team_members');
    expect(detail.datasources.find((source: any) => source.id === 'crm_activity_assignee_lookup_detail')?.query).toContain('crm_team_members');
    for (const [page, ids] of [[queue, ['schedule_crm_activity', 'edit_crm_activity']], [detail, ['schedule_lead_activity', 'edit_lead_activity']]] as any[]) {
      for (const id of ids) {
        const candidate = action(page, id);
        const assignee = (candidate.fields || []).find((field: any) => field.field === 'assigned_to');
        expect(assignee).toMatchObject({ type: 'select' });
        expect(String(assignee.options_source)).toMatch(/^crm_activity_assignee_lookup/);
        expect((candidate.mutation?.guards || []).some((guard: any) => String(guard.message || '').includes('active assignee'))).toBe(true);
      }
    }
  });

  it('keeps every permissioned CRM datasource represented in the AI catalog', async () => {
    let generated: any;
    const api = createAiAgentApi({
      appsRoot: join(import.meta.dir, '../'),
      authProvider: {
        async getCurrentUser() { return { id: 'reader-1', permissions: ['ai.write', 'crm.read'] }; },
        hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
      },
      provider: { async generate(input: any) { generated = input; return { parts: [] }; } },
      invoke: async () => null,
    });
    await api(new Request('http://localhost/api/ai/agent', {
      method: 'POST', body: JSON.stringify({ prompt: 'Review CRM' }),
    }), new URL('http://localhost/api/ai/agent'));
    const ids = new Set(generated.datasources.map((source: any) => source.id));
    for (const file of readdirSync(join(crmRoot, 'pages')).filter((entry) => entry.endsWith('.yaml'))) {
      const page = Bun.YAML.parse(readFileSync(join(crmRoot, 'pages', file), 'utf8')) as any;
      for (const source of page.datasources || []) {
        if (source.permission === 'crm.read') expect(ids.has(String(source.id))).toBe(true);
      }
    }
  });

  it('exposes assignment and merge audit events in the shared activity report', () => {
    const page = yaml('pages/activity-report.yaml');
    const source = page.datasources.find((candidate: any) => candidate.id === 'crm_assignment_audit_report');
    expect(source).toMatchObject({ permission: 'crm.read', single: false });
    expect(String(source.query)).toContain("IN ('assignment', 'merge', 'commercial')");
    expect(page.components).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'ListView', source: 'crm_assignment_audit_report' }),
    ]));
    expect(action(page, 'open_assignment_audit_lead')).toMatchObject({ navigate_to: '/lead-detail', permission: 'crm.read' });
  });

  it('exposes managed email templates and safe template-assisted messaging', () => {
    const configuration = yaml('pages/configuration.yaml');
    const templates = configuration.datasources.find((source: any) => source.id === 'crm_email_template_configuration');
    expect(templates).toMatchObject({ permission: 'crm.manage', single: false });
    expect(configuration.components).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'ListView', source: 'crm_email_template_configuration', create_action: 'create_crm_email_template' }),
    ]));
    expect(action(configuration, 'create_crm_email_template')).toMatchObject({ action: 'crm.email_templates.create', permission: 'crm.manage' });
    const message = action(yaml('pages/lead-detail.yaml'), 'send_lead_message');
    expect(message.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'template_id', options_source: 'crm_email_template_lookup_detail' }),
    ]));
    expect(String(message.mutation.steps[0].query)).toContain('{{lead_name}}');
    expect(String(message.mutation.guards[0].query)).toContain('template_id');
  });

  it('exposes immutable forecast snapshots and salesperson workload drill-downs', () => {
    const forecast = yaml('pages/forecast-snapshots.yaml');
    const snapshot = yaml('pages/expected-revenue.yaml');
    const workload = yaml('pages/salesperson-workload.yaml');
    expect(String(snapshot.actions.find((candidate: any) => candidate.id === 'capture_forecast_snapshot').mutation.steps[0].query)).toContain('ON CONFLICT(snapshot_date, lead_id) DO NOTHING');
    expect(forecast.datasources.find((source: any) => source.id === 'crm_forecast_snapshots')).toMatchObject({ permission: 'crm.read', single: false });
    expect(String(workload.datasources[0].query)).toContain("'Unassigned'");
    expect(workload.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'open_workload_pipeline', navigate_to: '/leads' }),
      expect.objectContaining({ id: 'open_workload_activities', navigate_to: '/crm-activities' }),
    ]));
  });

  it('exposes read-only team target attainment against live and captured forecasts', () => {
    const page = yaml('pages/team-target-attainment.yaml');
    const source = page.datasources[0];
    expect(source).toMatchObject({ id: 'crm_team_target_attainment', permission: 'crm.read', single: false });
    expect(String(source.query)).toContain('captured_weighted_pipeline');
    expect(String(source.query)).toContain('target_revenue');
    expect(action(page, 'open_target_attainment_pipeline')).toMatchObject({ navigate_to: '/leads', permission: 'crm.read' });
  });

  it('keeps customer CRM engagement rollups scoped to the selected customer', () => {
    const page = yaml('pages/customer-opportunities.yaml');
    const source = page.datasources.find((candidate: any) => candidate.id === 'crm_customer_activity_rollup');
    expect(String(source.query)).toContain('l.partner_id = :id');
    expect(String(source.query)).toContain('overdue_count');
    expect(page.components).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'StatRow', source: 'crm_customer_activity_rollup' }),
      expect.objectContaining({ type: 'StatRow', source: 'crm_customer_pipeline_health' }),
    ]));
    expect(String(page.datasources.find((candidate: any) => candidate.id === 'crm_customer_pipeline_health').query)).toContain('stale_count');
    expect(action(page, 'open_customer_opportunity')).toMatchObject({ navigate_to: '/lead-detail', permission: 'crm.read' });
    expect(String(action(page, 'open_customer_opportunity').params.id)).toContain('row.id');
  });

  it('exposes guarded opportunity commercial lines and rollups', () => {
    const detail = yaml('pages/lead-detail.yaml');
    const lines = detail.datasources.find((source: any) => source.id === 'crm_opportunity_lines');
    expect(lines).toMatchObject({ permission: 'crm.read', single: false });
    expect(String(detail.datasources.find((source: any) => source.id === 'crm_lead_detail').query)).toContain('line_subtotal');
    expect(action(detail, 'add_opportunity_line')).toMatchObject({ action: 'crm.opportunity_lines.create', permission: 'crm.write' });
    expect(action(detail, 'edit_opportunity_line')).toMatchObject({ action: 'crm.opportunity_lines.update', permission: 'crm.write' });
    expect(action(detail, 'remove_opportunity_line')).toMatchObject({ action: 'crm.opportunity_lines.remove', permission: 'crm.write' });
    expect(String(action(detail, 'remove_opportunity_line').mutation.steps[0].query)).toContain('crm_activities');
    expect(String(detail.datasources.find((source: any) => source.id === 'crm_engagement_timeline').query)).toContain('WHERE lead_id = :id');
    expect(detail.components).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'ContactGrid', source: 'crm_engagement_timeline' }),
    ]));
  });

  it('exposes follow-up effectiveness by team and salesperson', () => {
    const page = yaml('pages/followup-effectiveness.yaml');
    expect(String(page.datasources[0].query)).toContain('completed_followups');
    expect(String(page.datasources[0].query)).toContain('overdue_followups');
    expect(String(page.datasources[0].query)).toContain("l.stage = 'Won'");
    expect(action(page, 'open_effectiveness_pipeline')).toMatchObject({ navigate_to: '/leads', permission: 'crm.read' });
  });

  it('exposes pipeline hygiene counts and team drill-down', () => {
    const page = yaml('pages/pipeline-hygiene.yaml');
    expect(String(page.datasources[0].query)).toContain('stale_open');
    expect(String(page.datasources[0].query)).toContain('unassigned_open');
    expect(String(page.datasources[0].query)).toContain('overdue_activity');
    expect(action(page, 'open_hygiene_team_pipeline')).toMatchObject({ navigate_to: '/leads', permission: 'crm.read' });
  });

  it('protects legal holds and audits eligible retention deletion', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, name VARCHAR, type VARCHAR, team VARCHAR, active BOOLEAN, stage VARCHAR, updated_at TIMESTAMP);
      CREATE TABLE crm_retention_policies(id VARCHAR PRIMARY KEY, record_type VARCHAR, team VARCHAR, retention_days INTEGER, active BOOLEAN);
      CREATE TABLE crm_retention_holds(lead_id VARCHAR PRIMARY KEY, reason VARCHAR);
      CREATE TABLE crm_retention_deletion_audit(id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), lead_id VARCHAR, record_name VARCHAR, deleted_by VARCHAR, deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE crm_activities(id VARCHAR PRIMARY KEY, lead_id VARCHAR);
      INSERT INTO crm_retention_policies VALUES ('policy-1', 'all', NULL, 1, true);
      INSERT INTO crm_leads VALUES ('delete-me', 'Old lead', 'lead', NULL, false, 'New', CURRENT_TIMESTAMP - INTERVAL '3 days'), ('hold-me', 'Held lead', 'lead', NULL, false, 'New', CURRENT_TIMESTAMP - INTERVAL '3 days');
      INSERT INTO crm_retention_holds VALUES ('hold-me', 'Legal request');
    `);
    const mutation = action(yaml('pages/retention-review.yaml'), 'permanently_delete_retention_record').mutation;
    await repository.executeMutation(mutation, { id: 'delete-me', current_user_name: 'Manager' });
    expect((await repository.query("SELECT lead_id, record_name, deleted_by FROM crm_retention_deletion_audit"))[0]).toMatchObject({ lead_id: 'delete-me', record_name: 'Old lead', deleted_by: 'Manager' });
    let holdError: any;
    try { await repository.executeMutation(mutation, { id: 'hold-me', current_user_name: 'Manager' }); } catch (error) { holdError = error; }
    expect(String(holdError?.message || holdError)).toContain('Records under legal hold cannot be deleted');
  });

  it('exposes conversion operation history with source-lead navigation', () => {
    const page = yaml('pages/conversion-operations.yaml');
    expect(String(page.datasources[0].query)).toContain("a.activity_type = 'stage_change'");
    expect(String(page.datasources[0].query)).toContain('convert');
    expect(action(page, 'open_conversion_source')).toMatchObject({ navigate_to: '/lead-detail', permission: 'crm.read' });
    expect(String(page.datasources.find((candidate: any) => candidate.id === 'crm_conversion_exceptions').query)).toContain('conversion_blocked');
    expect(String(page.datasources.find((candidate: any) => candidate.id === 'crm_conversion_operation_totals').query)).toContain('converted');
    expect(action(page, 'open_conversion_exception')).toMatchObject({ navigate_to: '/lead-detail', permission: 'crm.read' });
  });

it('exposes permissioned stage-change history with opportunity navigation', () => {
  const page = yaml('pages/stage-movement.yaml');
  expect(String(page.datasources[0].query)).toContain("a.activity_type = 'stage_change'");
  expect(String(page.datasources.find((source: any) => source.id === 'crm_current_stage_duration').query)).toContain('current_age_days');
  expect(String(page.datasources.find((source: any) => source.id === 'crm_probability_change_audit').query)).toContain('resulting_probability');
  expect(String(page.datasources.find((source: any) => source.id === 'crm_probability_change_audit').query)).toContain('probability');
  expect(String(page.datasources[0].query)).toContain('created_by');
    expect(action(page, 'open_stage_movement_opportunity')).toMatchObject({ navigate_to: '/lead-detail', permission: 'crm.read' });
  });
});

it('exposes next planned activity fields on the pipeline board source', () => {
  const page = yaml('pages/leads.yaml');
  const query = String(page.datasources.find((source: any) => source.id === 'crm_leads').query);
  expect(query).toContain('next_activity_summary');
  expect(query).toContain('next_activity_due_date');
  expect(query).toContain('next_activity_overdue');
  const board = page.components[0].views.find((view: any) => view.id === 'kanban');
  expect(board.group_by).toBe('stage');
  expect(board.groups_source).toBe('crm_lead_stages');
  expect(page.components[0].filters).toEqual(expect.arrayContaining([
    expect.objectContaining({ field: 'stage' }),
    expect.objectContaining({ field: 'team' }),
    expect.objectContaining({ field: 'salesperson' }),
  ]));
  expect(page.datasources.find((source: any) => source.id === 'crm_leads').workflow).toBe('crm_leads');
});

it('exposes CRM activity execution outcomes and summary navigation', () => {
  const page = yaml('pages/activity-execution.yaml');
  expect(String(page.datasources[0].query)).toContain('overdue_count');
  expect(String(page.datasources[0].query)).toContain('chained_count');
  expect(String(page.datasources[1].query)).toContain('outcome_note');
  expect(action(page, 'open_activity_execution_opportunity')).toMatchObject({ navigate_to: '/lead-detail', permission: 'crm.read' });
  const activities = yaml('pages/activities.yaml');
  expect(action(activities, 'complete_crm_activity').type).toBe('server_form');
  expect(action(activities, 'complete_crm_activity').fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'outcome_note' })]));
  expect(String(action(activities, 'complete_crm_activity').mutation.steps[0].query)).toContain('outcome_note');
});

it('covers CRM attribution and outcome analysis declarations', () => {
  const page = yaml('pages/analysis.yaml');
  const source = page.datasources.find((candidate: any) => candidate.id === 'crm_source_performance');
  const campaign = page.datasources.find((candidate: any) => candidate.id === 'crm_utm_campaign_performance');
  const outcomes = page.datasources.find((candidate: any) => candidate.id === 'crm_win_loss');
  expect(String(source.query)).toContain("COALESCE(NULLIF(source, ''), 'Unknown')");
  expect(String(source.query)).toContain('win_rate');
  expect(String(campaign.query)).toContain("COALESCE(NULLIF(utm_campaign, ''), 'Unattributed')");
  expect(String(outcomes.query)).toContain("stage IN ('Won', 'Lost')");
  expect(action(page, 'drilldown_source_leads')).toMatchObject({ navigate_to: '/leads', permission: 'crm.read' });
  expect(action(page, 'drilldown_campaign_leads')).toMatchObject({ navigate_to: '/leads', permission: 'crm.read' });
});

it('declares qualification completeness and no-write qualification guards', () => {
  const page = yaml('pages/qualification.yaml');
  expect(String(page.datasources[0].query)).toContain('completeness_status');
  expect(String(page.datasources[0].query)).toContain("l.stage = 'New'");
  expect(String(page.datasources[1].query)).toContain('qualified_count');
  expect(action(page, 'open_qualification_lead')).toMatchObject({ navigate_to: '/lead-detail', permission: 'crm.read' });
  const qualify = yaml('pages/lead-workflow.yaml').workflow.transitions.find((candidate: any) => candidate.id === 'qualify');
  expect(String(qualify.mutation.guards[1].query)).toContain('expected_revenue');
  expect(String(qualify.mutation.guards[1].message)).toContain('Complete contact');
});

it('exposes permissioned team operations with shared period filters and drill-down', () => {
  const page = yaml('pages/team-operations.yaml');
  const team = String(page.datasources.find((source: any) => source.id === 'crm_team_operations').query);
  const members = String(page.datasources.find((source: any) => source.id === 'crm_team_operations_members').query);
  expect(team).toContain('weighted_value');
  expect(team).toContain('unassigned_opportunities');
  expect(team).toContain(':date_from');
  expect(team).toContain(':date_to');
  expect(members).toContain('planned_activities');
  expect(members).toContain(':team');
  expect(action(page, 'open_team_operations_leads')).toMatchObject({ navigate_to: '/leads', permission: 'crm.read' });
});

it('exposes guarded overdue escalation remediation', () => {
  const page = yaml('pages/escalations.yaml');
  expect(String(page.datasources[0].query)).toContain("a.state = 'planned'");
  expect(String(page.datasources[0].query)).toContain("l.stage NOT IN ('Won', 'Lost')");
  expect(String(page.datasources.find((source: any) => source.id === 'crm_escalation_summary').query)).toContain('escalated_count');
  expect(String(page.datasources.find((source: any) => source.id === 'crm_escalation_summary').query)).toContain('rescheduled_count');
  const actionCandidate = action(page, 'remediate_crm_escalation');
  expect(actionCandidate).toMatchObject({ type: 'server_form', permission: 'crm.write' });
  expect(String(actionCandidate.mutation.guards[0].query)).toContain('l.active = true');
  expect(String(actionCandidate.mutation.guards[0].query)).toContain("a.state = 'planned'");
  expect(actionCandidate.mutation.fields).toContain('escalation_state');
  expect(actionCandidate.mutation.defaults.escalation_state).toBe('rescheduled');
  expect(action(page, 'open_escalation_opportunity')).toMatchObject({ navigate_to: '/lead-detail', permission: 'crm.read' });
});

it('exposes scoped CRM audit governance with retention and export controls', () => {
  const page = yaml('pages/audit-governance.yaml');
  const query = String(page.datasources.find((source: any) => source.id === 'crm_opportunity_audit').query);
  expect(query).toContain(':lead_id');
  expect(query).toContain('retention_status');
  expect(query).toContain('actor_name');
  expect(action(page, 'open_audit_opportunity')).toMatchObject({ navigate_to: '/lead-detail', permission: 'crm.read' });
  expect(page.components[0].actions).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'crm.audit_governance.export', permission: 'crm.read' })]));
});

it('declares delivery metadata for CRM messages', () => {
  const message = action(yaml('pages/lead-detail.yaml'), 'send_lead_message');
  expect(message.mutation.fields).toEqual(expect.arrayContaining(['delivery_status', 'delivery_attempts']));
  expect(message.mutation.defaults).toMatchObject({ delivery_status: 'sent', delivery_attempts: 1 });
});

it('exposes guarded CRM message delivery retry and opportunity navigation', () => {
  const page = yaml('pages/communications.yaml');
  expect(String(page.datasources[0].query)).toContain('delivery_status');
  const retry = action(page, 'retry_crm_message');
  expect(retry).toMatchObject({ permission: 'crm.write', action: 'crm.messages.retry' });
  expect(String(retry.mutation.guards[0].query)).toContain("a.delivery_status = 'failed'");
  expect(String(retry.mutation.guards[0].query)).toContain("l.stage NOT IN ('Won', 'Lost')");
  expect(String(retry.mutation.guards[1].query)).toContain('allow_email');
  expect(action(page, 'open_communication_opportunity')).toMatchObject({ navigate_to: '/lead-detail', permission: 'crm.read' });
  expect(String(page.datasources.find((source: any) => source.id === 'crm_communication_effectiveness').query)).toContain('replied_count');
  expect(String(page.datasources.find((source: any) => source.id === 'crm_communication_effectiveness').query)).toContain('utm_campaign');
});

it('exposes deterministic score explanations with governed filters', () => {
  const page = yaml('pages/scoring-governance.yaml');
  const query = String(page.datasources.find((source: any) => source.id === 'crm_score_explanations').query);
  expect(query).toContain('contribution');
  expect(query).toContain('r.active = true');
  expect(query).toContain(':team');
  expect(query).toContain(':source');
  expect(String(page.datasources.find((source: any) => source.id === 'crm_score_governance').query)).toContain("'Hot'");
  expect(page.components[0].filter_sources).toEqual(expect.arrayContaining(['crm_score_explanations', 'crm_score_governance']));
  expect(String(page.datasources.find((source: any) => source.id === 'crm_score_audit').query)).toContain('rule_version');
  expect(action(page, 'recalculate_lead_score')).toMatchObject({ action: 'crm.scoring.recalculate', permission: 'crm.write' });
});

it('exposes active-record CRM data quality and guarded normalization navigation', () => {
  const page = yaml('pages/data-quality.yaml');
  expect(String(page.datasources[0].query)).toContain('quality_status');
  expect(String(page.datasources[0].query)).toContain('l.active = true');
  expect(String(page.datasources[1].query)).toContain('issue_count');
  expect(action(page, 'edit_quality_lead')).toMatchObject({ type: 'server_form', action: 'crm.leads.normalize_contact', permission: 'crm.write' });
  expect(String(action(page, 'edit_quality_lead').mutation.guards[0].query)).toContain("stage NOT IN ('Won', 'Lost')");
  expect(String(action(page, 'edit_quality_lead').mutation.guards[1].query)).toContain("LIKE '%@%'");
  expect(String(action(page, 'edit_quality_lead').mutation.steps[0].query)).toContain('data_quality');
  expect(action(page, 'open_quality_lead')).toMatchObject({ navigate_to: '/lead-detail', permission: 'crm.read' });
});

it('exposes immutable forecast accuracy comparison with low-sample evidence', () => {
  const page = yaml('pages/forecast-accuracy.yaml');
  const query = String(page.datasources[0].query);
  expect(query).toContain('captured_weighted_value');
  expect(query).toContain('realized_won_value');
  expect(query).toContain('variance');
  expect(query).toContain('Low sample');
  expect(query).toContain(':date_from');
  expect(query).toContain(':date_to');
  const causes = String(page.datasources.find((source: any) => source.id === 'crm_forecast_variance_causes').query);
  expect(causes).toContain('variance_cause');
  expect(causes).toContain('Stage changed');
  expect(causes).toContain('current_probability');
});

it('adds activity-state facet filtering to the shared CRM pipeline source', () => {
  const page = yaml('pages/leads.yaml');
  const source = page.datasources.find((candidate: any) => candidate.id === 'crm_leads');
  expect(String(source.query)).toContain(':activity_state');
  expect(String(source.query)).toContain('EXISTS (SELECT 1 FROM crm_activities');
  expect(page.components[0].filters).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'activity_state', options_source: 'crm_activity_state_lookup' })]));
});

it('declares generic saved-view persistence and scoped CRUD in base', () => {
  const page = Bun.YAML.parse(readFileSync(join(crmRoot, '../../services/base/pages/saved-views.yaml'), 'utf8')) as any;
  expect(String(page.datasources[0].query)).toContain("visibility = 'shared'");
  expect(action(page, 'create_saved_view').mutation.table).toBe('ui_saved_views');
  expect(action(page, 'edit_saved_view').mutation.fields).toEqual(expect.arrayContaining(['filters', 'group_by']));
  expect(action(page, 'edit_saved_view').mutation.increment_fields).toEqual(['filter_version']);
  expect(action(page, 'edit_saved_view').mutation.concurrency).toEqual({ field: 'row_version', input: 'expected_row_version' });
  expect(page.components[0].columns).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'filter_version' })]));
  expect(action(page, 'delete_saved_view').mutation.operation).toBe('delete');
  expect(action(page, 'apply_saved_view').action).toBe('ui.saved_views.apply');
  expect(String(action(page, 'apply_saved_view').mutation.steps[0].query)).toContain('usage_count = usage_count + 1');
  expect(String(action(page, 'apply_saved_view').mutation.steps[0].query)).toContain('last_applied_at = CURRENT_TIMESTAMP');
  expect(String(action(page, 'edit_saved_view').mutation.guards[0].query)).toContain('owner_id');
  expect(String(action(page, 'delete_saved_view').mutation.guards[0].query)).toContain('current_user_id');
  expect(action(page, 'create_saved_view').mutation.defaults.owner_id).toBe('{current_user_id}');
});

it('binds persisted shared CRM pipeline views to the generic ListView contract', () => {
  const page = yaml('pages/leads.yaml');
  expect(page.components[0].saved_views_source).toBe('crm_persisted_pipeline_views');
  expect(String(page.datasources.find((source: any) => source.id === 'crm_persisted_pipeline_views').query)).toContain("resource = 'crm_leads'");
  expect(String(page.datasources.find((source: any) => source.id === 'crm_persisted_pipeline_views').query)).toContain('current_user_id');
  expect(String(page.datasources.find((source: any) => source.id === 'crm_persisted_pipeline_views').query)).toContain('crm_team_members');
  expect(page.components[0].saved_views_version).toBe(1);
});

it('declares customer account rollups and guarded contact relationships', () => {
  const accounts = yaml('pages/customer-accounts.yaml');
  const detail = yaml('pages/customer-account-detail.yaml');
  expect(String(accounts.datasources.find((source: any) => source.id === 'crm_customer_accounts').query)).toContain('open_opportunity_count');
  expect(String(accounts.datasources.find((source: any) => source.id === 'crm_customer_accounts').query)).toContain('is_company = true');
  const addContact = action(accounts, 'add_crm_account_contact');
  expect(addContact).toMatchObject({ action: 'crm.accounts.add_contact', permission: 'crm.write' });
  expect(addContact.mutation.table).toBe('crm_contact_company_relationships');
  expect(String(addContact.mutation.guards[1].query)).toContain('is_company = false');
  expect(String(addContact.mutation.guards[2].query)).toContain('NOT EXISTS');
  expect(String(detail.datasources.find((source: any) => source.id === 'crm_account_contacts').query)).toContain('company_id = :id');
  expect(String(detail.datasources.find((source: any) => source.id === 'crm_account_opportunities').query)).toContain('partner_id = :id');
  const removeContact = action(detail, 'remove_crm_account_contact');
  expect(removeContact).toMatchObject({ action: 'crm.accounts.remove_contact', permission: 'crm.write' });
  expect(removeContact.mutation.defaults).toMatchObject({ active: false });
  expect(String(removeContact.mutation.guards[0].query)).toContain('r.active = true');
  const editContact = action(detail, 'edit_crm_account_contact');
  expect(editContact).toMatchObject({ action: 'crm.accounts.update_contact', permission: 'crm.write' });
  expect(editContact.mutation.fields).toEqual(['relationship_type']);
});

it('declares funnel, source cohort, and salesperson velocity analysis', () => {
  const page = yaml('pages/funnel-analysis.yaml');
  expect(String(page.datasources.find((source: any) => source.id === 'crm_funnel_by_stage').query)).toContain('weighted_value');
  expect(String(page.datasources.find((source: any) => source.id === 'crm_funnel_by_stage').query)).toContain(':date_from');
  const cohorts = String(page.datasources.find((source: any) => source.id === 'crm_source_conversion_cohorts').query);
  expect(cohorts).toContain('Unattributed');
  expect(cohorts).toContain('conversion_rate');
  const velocity = String(page.datasources.find((source: any) => source.id === 'crm_salesperson_conversion_velocity').query);
  expect(velocity).toContain('average_days_to_outcome');
  expect(velocity).toContain('overdue_followups');
});

it('declares activity outcomes and follow-up readiness reporting', () => {
  const activities = yaml('pages/activities.yaml');
  const edit = action(activities, 'edit_crm_activity');
  expect(edit.mutation.fields).toContain('outcome_type');
  expect(edit.fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'outcome_type' })]));
  const readiness = yaml('pages/activity-readiness.yaml');
  expect(String(readiness.datasources[0].query)).toContain("a.state = 'done'");
  expect(String(readiness.datasources[0].query)).toContain('Needs follow-up');
  expect(String(readiness.datasources[1].query)).toContain('chained_count');
  expect(action(readiness, 'open_readiness_opportunity')).toMatchObject({ navigate_to: '/lead-detail', permission: 'crm.read' });
});

it('declares partner directory, referral performance, and scoped opportunities', () => {
  const page = yaml('pages/partner-operations.yaml');
  const directory = String(page.datasources.find((source: any) => source.id === 'crm_partner_directory').query);
  expect(directory).toContain('referral_count');
  expect(directory).toContain('c.active = true');
  const performance = String(page.datasources.find((source: any) => source.id === 'crm_referral_performance').query);
  expect(performance).toContain('conversion_rate');
  expect(performance).toContain('Unattributed');
  expect(String(page.datasources.find((source: any) => source.id === 'crm_partner_opportunities').query)).toContain('referrer_contact_id = :id');
  expect(action(page, 'open_partner_opportunities')).toMatchObject({ navigate_to: '/customer-opportunities', permission: 'crm.read' });
});

it('declares transparent salesperson achievement scoring', () => {
  const page = yaml('pages/achievement.yaml');
  const leaderboard = String(page.datasources.find((source: any) => source.id === 'crm_achievement_leaderboard').query);
  expect(leaderboard).toContain('achievement_points');
  expect(leaderboard).toContain('m.active = true');
  expect(leaderboard).toContain(':date_from');
  expect(String(page.datasources.find((source: any) => source.id === 'crm_achievement_detail').query)).toContain('completed_count');
  expect(page.components[0].filters).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'team', options_source: 'crm_achievement_teams' })]));
});

it('declares scoped partner search with customer opportunity navigation', () => {
  const page = yaml('pages/partner-search.yaml');
  const query = String(page.datasources[0].query);
  expect(query).toContain('c.active = true');
  expect(query).toContain('c.email');
  expect(query).toContain('c.city');
  expect(query).toContain('active_opportunity_count');
  expect(action(page, 'open_searched_partner')).toMatchObject({ navigate_to: '/customer-opportunities', permission: 'crm.read' });
});

it('exposes duplicate conflict fields for merge review', () => {
  const page = yaml('pages/duplicate-leads.yaml');
  const query = String(page.datasources[0].query);
  expect(query).toContain('survivor_name');
  expect(query).toContain('duplicate_owner');
  expect(query).toContain('HAVING COUNT(*) > 1');
  expect(page.components[0].columns).toEqual(expect.arrayContaining([
    expect.objectContaining({ field: 'survivor_stage' }),
    expect.objectContaining({ field: 'duplicate_stage' }),
  ]));
  const merge = action(yaml('pages/leads.yaml'), 'merge_leads');
  expect(String(merge.mutation.steps[0].query)).toContain('crm_merge_audit');
  expect(String(merge.mutation.steps[0].query)).toContain('retained_fields');
  const pair = action(page, 'merge_duplicate_pair');
  expect(pair).toMatchObject({ action: 'crm.leads.merge_pair', permission: 'crm.write' });
  expect(pair.fields).toEqual(expect.arrayContaining([
    expect.objectContaining({ field: 'survivor_id', required: true }),
    expect.objectContaining({ field: 'retained_fields', required: true }),
  ]));
  expect(String(pair.mutation.guards[1].query)).toContain('id <> :survivor_id');
  expect(String(pair.mutation.steps[2].query)).toContain('crm_merge_audit');
});

it('declares campaign workspace and attribution quality review', () => {
  const page = yaml('pages/campaign-governance.yaml');
  expect(String(page.datasources[0].query)).toContain('attributed_leads');
  expect(String(page.datasources[0].query)).toContain('won_leads');
  const quality = String(page.datasources[1].query);
  expect(quality).toContain('Unattributed');
  expect(quality).toContain('Inactive campaign');
  expect(quality).toContain('Incomplete attribution');
  const config = yaml('pages/configuration.yaml');
  const toggle = action(config, 'toggle_crm_campaign');
  expect(toggle.type).toBe('server_form');
  expect(toggle.fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'status_reason', required: true })]));
  expect(String(toggle.mutation.steps[0].query)).toContain('status_reason');
});

it('declares manager-aware team scope on the primary CRM lead read', () => {
  const query = String(yaml('pages/leads.yaml').datasources.find((source: any) => source.id === 'crm_leads').query);
  expect(query).toContain('can_manage_crm');
  expect(query).toContain('crm_team_members');
  expect(String(yaml('pages/activities.yaml').datasources[0].query)).toContain('can_manage_crm');
  expect(String(yaml('pages/customer-opportunities.yaml').datasources[0].query)).toContain('can_manage_crm');
  expect(yaml('pages/analysis.yaml').datasources.find((source: any) => source.id === 'crm_pipeline_by_team').team_scope).toBe(true);
  expect(yaml('pages/analysis.yaml').datasources.find((source: any) => source.id === 'crm_lead_distribution').team_scope).toBe(true);
  expect(yaml('pages/forecast-accuracy.yaml').datasources.find((source: any) => source.id === 'crm_forecast_accuracy').team_scope).toBe(true);
  expect(yaml('pages/team-operations.yaml').datasources.find((source: any) => source.id === 'crm_team_operations').team_scope).toBe(true);
  expect(yaml('pages/activity-execution.yaml').datasources.find((source: any) => source.id === 'crm_activity_execution_summary').team_scope).toBe(true);
  expect(yaml('pages/escalations.yaml').datasources.find((source: any) => source.id === 'crm_escalation_summary').team_scope).toBe(true);
  expect(yaml('pages/communications.yaml').datasources.find((source: any) => source.id === 'crm_communication_effectiveness').team_scope).toBe(true);
  expect(yaml('pages/lead-distribution.yaml').datasources.find((source: any) => source.id === 'crm_lead_distribution_report').team_scope).toBe(true);
  expect(yaml('pages/expected-revenue.yaml').datasources.find((source: any) => source.id === 'crm_expected_revenue_teams').team_scope).toBe(true);
  expect(yaml('pages/quality-leads.yaml').datasources.find((source: any) => source.id === 'crm_quality_teams').team_scope).toBe(true);
  expect(yaml('pages/scoring-governance.yaml').datasources.find((source: any) => source.id === 'crm_scoring_teams').team_scope).toBe(true);
  expect(yaml('pages/activity-readiness.yaml').datasources.every((source: any) => source.team_scope === true)).toBe(true);
  expect(yaml('pages/activity-report.yaml').datasources.find((source: any) => source.id === 'crm_activity_report_by_team').team_scope).toBe(true);
  expect(yaml('pages/activity-report.yaml').datasources.find((source: any) => source.id === 'crm_assignment_audit_report').team_scope).toBe(true);
  expect(yaml('pages/archived-leads.yaml').datasources[0].team_scope).toBe(true);
  expect(yaml('pages/lead-detail.yaml').datasources[0].team_scope).toBe(true);
  expect(yaml('pages/partner-operations.yaml').datasources.find((source: any) => source.id === 'crm_referral_performance').team_scope).toBe(true);
  expect(yaml('pages/pipeline-hygiene.yaml').datasources[0].team_scope).toBe(true);
  expect(yaml('pages/qualification.yaml').datasources.every((source: any) => source.team_scope === true)).toBe(true);
  expect(yaml('pages/stage-movement.yaml').datasources.every((source: any) => source.team_scope === true)).toBe(true);
  expect(yaml('pages/achievement.yaml').datasources.filter((source: any) => source.id !== 'crm_achievement_teams').every((source: any) => source.team_scope === true)).toBe(true);
  expect(yaml('pages/team-target-attainment.yaml').datasources[0].team_scope).toBe(true);
});

it('requires and persists a reason for campaign status changes', async () => {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await repository.run("CREATE TABLE crm_campaigns(id VARCHAR PRIMARY KEY, name VARCHAR, active BOOLEAN, status_reason VARCHAR); INSERT INTO crm_campaigns VALUES ('campaign-1', 'Spring', true, NULL)");
  const toggle = action(yaml('pages/configuration.yaml'), 'toggle_crm_campaign');
  await expect(repository.executeMutation(toggle.mutation, { id: 'campaign-1', status_reason: 'Campaign ended', current_user_name: 'BA' })).resolves.toMatchObject({ active: false, status_reason: 'Campaign ended' });
  await expect(repository.executeMutation(toggle.mutation, { id: 'campaign-1', status_reason: '' })).rejects.toMatchObject({ status: 400 });
});

it('executes pairwise merge with explicit survivor fields and provenance', async () => {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await repository.run(`
    CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, row_version BIGINT DEFAULT 1, name VARCHAR, type VARCHAR,
      partner_id VARCHAR, partner_name VARCHAR, email VARCHAR, phone VARCHAR, source VARCHAR, salesperson VARCHAR,
      team VARCHAR, tags VARCHAR, expected_revenue INTEGER, stage VARCHAR, probability INTEGER,
      active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE crm_activities(id VARCHAR PRIMARY KEY, lead_id VARCHAR, activity_type VARCHAR, summary VARCHAR,
      state VARCHAR, completed_at TIMESTAMP, created_by VARCHAR);
    CREATE TABLE crm_merge_audit(id VARCHAR PRIMARY KEY, survivor_id VARCHAR, merged_id VARCHAR, actor VARCHAR,
      retained_fields VARCHAR, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    INSERT INTO crm_leads(id, name, type, stage, probability, active) VALUES ('survivor-1', 'Keep', 'opportunity', 'New', 10, true);
    INSERT INTO crm_leads(id, name, type, stage, probability, active, email) VALUES ('duplicate-1', 'Drop', 'lead', 'Qualified', 20, true, 'chosen@example.test');
    INSERT INTO crm_activities(id, lead_id, activity_type, summary, state) VALUES ('pair-activity', 'duplicate-1', 'Call', 'Keep history', 'done');
  `);
  const pair = action(yaml('pages/duplicate-leads.yaml'), 'merge_duplicate_pair');
  await repository.executeMutation(pair.mutation, {
    survivor_id: 'survivor-1', duplicate_id: 'duplicate-1', partner_id: '', partner_name: 'Chosen customer',
    email: 'chosen@example.test', phone: '', source: 'Referral', salesperson: 'Sales User', team: 'Enterprise',
    tags: 'priority', expected_revenue: '9000', retained_fields: 'email=duplicate-1;source=manual', current_user_name: 'BA',
  });
  expect((await repository.query("SELECT name, email, source, salesperson, team, tags, expected_revenue FROM crm_leads WHERE id = 'survivor-1'"))[0]).toMatchObject({ name: 'Keep', email: 'chosen@example.test', source: 'Referral', salesperson: 'Sales User', team: 'Enterprise', tags: 'priority', expected_revenue: 9000 });
  expect((await repository.query("SELECT id FROM crm_leads WHERE id = 'duplicate-1'"))).toEqual([]);
  expect((await repository.query("SELECT lead_id FROM crm_activities WHERE id = 'pair-activity'"))[0].lead_id).toBe('survivor-1');
  expect((await repository.query("SELECT survivor_id, merged_id, actor, retained_fields FROM crm_merge_audit"))[0]).toMatchObject({ survivor_id: 'survivor-1', merged_id: 'duplicate-1', actor: 'BA', retained_fields: 'email=duplicate-1;source=manual' });
});
