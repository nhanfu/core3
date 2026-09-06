import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import { createAiAgentApi } from '../services/ai/api/ai-agent-api.ts';

const crmRoot = join(import.meta.dir, '../services/crm');
const parseYaml = (file: string) => Bun.YAML.parse(readFileSync(file, 'utf8')) as any;
const yaml = (file: string) => {
  const page = parseYaml(join(crmRoot, file));
  const pageId = page.page?.id;
  if (!pageId || !file.startsWith('pages/')) return page;

  const apiRoot = join(crmRoot, 'api');
  for (const apiFile of readdirSync(apiRoot).filter((entry) => entry.endsWith('.yaml'))) {
    const fragment = parseYaml(join(apiRoot, apiFile));
    if (fragment.page?.id !== pageId) continue;
    for (const key of ['datasources', 'actions']) {
      if (Array.isArray(fragment[key])) page[key] = [...(page[key] || []), ...fragment[key]];
    }
    for (const key of ['workflow']) {
      if (fragment[key] !== undefined) page[key] = fragment[key];
    }
  }
  return page;
};
const aiYaml = (file: string) => Bun.YAML.parse(readFileSync(join(import.meta.dir, '../services/ai', file), 'utf8')) as any;
const action = (page: any, id: string) => page.actions.find((candidate: any) => candidate.id === id);

describe('CRM YAML lifecycle integration', () => {
  it('applies the complete CRM migration chain on a fresh DuckDB database', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(crmRoot, 'migrations'), undefined, 'crm_test_schema_migrations', ['schema', 'data']);
    expect((await repository.query("SELECT version FROM crm_test_schema_migrations WHERE version = '0.0.17'")).length).toBe(1);
    expect((await repository.query("SELECT table_name FROM information_schema.tables WHERE table_name IN ('crm_leads', 'crm_settings', 'crm_tags', 'crm_activity_plans', 'crm_team_members') ORDER BY table_name")).map((row: any) => row.table_name)).toEqual(['crm_activity_plans', 'crm_leads', 'crm_settings', 'crm_tags', 'crm_team_members']);
    expect((await repository.query("SELECT use_leads, lead_enrichment_mode FROM crm_settings WHERE id = 'crm-settings'")).map((row: any) => row)).toEqual([{ use_leads: true, lead_enrichment_mode: 'disabled' }]);
    expect((await repository.query('SELECT COUNT(*) AS count FROM crm_team_members'))[0].count).toBeGreaterThan(0);
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
      CREATE TABLE crm_activities(id VARCHAR PRIMARY KEY, lead_id VARCHAR, activity_type VARCHAR,
        summary VARCHAR, state VARCHAR, completed_at TIMESTAMP);
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
    expect((await repository.query('SELECT partner_name, email, source, salesperson, team, tags, utm_campaign, utm_medium, utm_source, expected_revenue, row_version FROM crm_leads WHERE id = ?', ['lead-z']))[0]).toMatchObject({ partner_name: 'Acme', email: 'buyer@example.test', source: 'Website', salesperson: 'Sales User', team: 'Enterprise', tags: 'urgent, enterprise', utm_campaign: 'spring-launch', utm_medium: 'email', utm_source: 'newsletter', expected_revenue: 4200, row_version: 2 });
  });

  it('enforces the sales team lead setting when creating a lead', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, name VARCHAR, type VARCHAR, partner_id VARCHAR, source VARCHAR, team VARCHAR,
        stage VARCHAR, probability INTEGER, expected_revenue INTEGER, priority VARCHAR);
      CREATE TABLE base_contacts(id VARCHAR PRIMARY KEY, active BOOLEAN DEFAULT true);
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
    await repository.run(`CREATE TABLE crm_leads(stage VARCHAR, expected_revenue DECIMAL(18,2), probability INTEGER, source VARCHAR); INSERT INTO crm_leads VALUES ('Proposition', 1000, 60, NULL), ('Qualified', 500, 25, ''), ('Won', 900, 100, 'Referral');`);
    const analysis = yaml('pages/analysis.yaml');
    const query = String(analysis.datasources.find((source: any) => source.id === 'crm_pipeline_totals').query);
    const result = (await repository.query(query))[0];
    expect(Number(result.pipeline_revenue)).toBe(1500);
    expect(Number(result.weighted_pipeline_revenue)).toBe(725);
    const bySource = String(analysis.datasources.find((source: any) => source.id === 'crm_pipeline_by_source').query);
    expect(await repository.query(bySource)).toEqual([
      { source: 'Unknown', lead_count: 2, revenue: 1500 },
      { source: 'Referral', lead_count: 1, revenue: 900 },
    ]);
  });

  it('requires an active configured lost reason', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, stage VARCHAR, lost_reason VARCHAR, probability INTEGER, row_version BIGINT, updated_at TIMESTAMP);
      CREATE TABLE crm_lost_reasons(id VARCHAR PRIMARY KEY, active BOOLEAN);
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
  });

  it('resolves contact lookups through the registered base YAML service', () => {
    expect(yaml('pages/leads.yaml').datasources.find((source: any) => source.id === 'crm_contacts')).toMatchObject({
      type: 'service', service: 'yaml.service.base', operation: 'contacts.search', permission: 'base.contacts.read',
    });
    expect(yaml('pages/leads.yaml').actions.find((candidate: any) => candidate.id === 'edit_lead').mutation.fields).toContain('partner_id');
    expect(yaml('pages/lead-detail.yaml').actions.find((candidate: any) => candidate.id === 'edit_lead_detail').mutation.fields).toContain('partner_id');
  });

  it('exposes lead routing fields on create and edit forms', () => {
    const leads = yaml('pages/leads.yaml');
    for (const id of ['create_lead', 'edit_lead']) {
      const fields = action(leads, id).fields;
      expect(fields).toEqual(expect.arrayContaining([
        expect.objectContaining({ field: 'salesperson' }),
        expect.objectContaining({ field: 'team', type: 'select', options_source: 'crm_sales_teams' }),
      ]));
    }
  });

  it('requires linked CRM contacts to remain active', () => {
    const leads = yaml('pages/leads.yaml');
    const detail = yaml('pages/lead-detail.yaml');
    for (const page of [leads, detail]) {
      const forms = page.actions.filter((action: any) => action.type === 'server_form');
      expect(forms.some((action: any) => String(action.mutation?.guards?.[0]?.query || '').includes('base_contacts') && action.mutation.guards[0].query.includes('active = true'))).toBe(true);
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
    expect(activities.components[0].filters).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'activity_type', options_source: 'crm_activity_type_lookup' }),
    ]));
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
    expect(plan.fields).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'plan_id', options_source: 'crm_activity_plans_detail' })]));
  });

  it('materializes active activity-plan steps in sequence with due dates and ownership', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE crm_leads(id VARCHAR PRIMARY KEY, stage VARCHAR, salesperson VARCHAR);
      CREATE TABLE crm_activity_plans(id VARCHAR PRIMARY KEY, active BOOLEAN);
      CREATE TABLE crm_activity_plan_steps(
        id VARCHAR PRIMARY KEY, plan_id VARCHAR, sequence INTEGER, activity_type VARCHAR,
        summary VARCHAR, delay_days INTEGER, active BOOLEAN
      );
      CREATE TABLE crm_activities(
        id VARCHAR PRIMARY KEY, lead_id VARCHAR, activity_type VARCHAR, summary VARCHAR,
        due_date DATE, assigned_to VARCHAR, state VARCHAR, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
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
    await repository.run("CREATE TABLE crm_leads(tags VARCHAR); INSERT INTO crm_leads VALUES ('urgent, enterprise'), ('enterprise'), (NULL)");
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
      'services/crm/manifest.yaml',
      'services/crm/pages/leads.yaml',
      'services/crm/pages/lead-detail.yaml',
      'services/crm/pages/activities.yaml',
      'services/crm/pages/analysis.yaml',
      'services/crm/pages/lost-opportunities.yaml',
      'services/crm/pages/quality-leads.yaml',
      'services/crm/pages/expected-revenue.yaml',
      'services/crm/pages/unattended-leads.yaml',
      'services/crm/pages/tags.yaml',
      'services/crm/pages/my-pipeline.yaml',
      'services/crm/pages/unassigned-leads.yaml',
      'services/crm/pages/teams.yaml',
      'services/crm/pages/configuration.yaml',
      'services/crm/pages/lead-workflow.yaml',
      'services/order/pages/sale-quotations.yaml',
    ]));
    const agent = Bun.YAML.parse(readFileSync(join(import.meta.dir, '../services/ai/agent.yaml'), 'utf8')) as any;
    expect(agent.context_paths).toEqual(expect.arrayContaining([
      'services/crm/pages/quality-leads.yaml', 'services/crm/pages/configuration.yaml',
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
      const page = yaml(`pages/${file}`);
      for (const operation of page.actions || []) {
        if (operation.action && ['server', 'server_form'].includes(operation.type)) declared.add(String(operation.action));
      }
    }
    expect([...declared].filter((id) => id.startsWith('crm.')).filter((id) => !allowed.has(id))).toEqual([]);
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
      const page = yaml(`pages/${file}`);
      for (const source of page.datasources || []) {
        if (source.permission === 'crm.read') expect(ids.has(String(source.id))).toBe(true);
      }
    }
  });
});
