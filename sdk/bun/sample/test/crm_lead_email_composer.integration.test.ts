import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((entry: any) => entry.id === id);

describe('CRM lead email composer parity CRM-LEAD-EMAIL-COMPOSER-001', () => {
  test('maps Odoo comment and mass-mail actions into separate YAML page/API contracts', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/crm/views/crm_lead_views.xml', 'utf8');
    const leadsPage = yaml('pages/leads.yaml');
    const leadsApi = yaml('api/leads.yaml');
    const detailPage = yaml('pages/lead-detail.yaml');
    const detailApi = yaml('api/lead-detail.yaml');
    const bulk = action(leadsApi, 'send_leads_email');
    const single = action(detailApi, 'send_lead_email_detail');

    expect(source).toContain('default_composition_mode');
    expect(source).toContain('id="action_lead_mail_compose"');
    expect(source).toContain("'default_composition_mode': 'comment'");
    expect(source).toContain("'default_composition_mode': 'mass_mail'");
    expect(source).toContain('<field name="binding_view_types">list,kanban</field>');
    expect(leadsPage.components[0].bulk_actions).toContainEqual(expect.objectContaining({ id: 'send_leads_email', label: 'Email', permission: 'crm.write' }));
    expect(detailPage.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'send_lead_email_detail', label: 'Send email', permission: 'crm.write' }));
    expect(bulk).toMatchObject({ type: 'server_form', modal_style: 'mail_composer', permission: 'crm.write', action: 'crm.leads.email', handler: 'yaml_mutation', operation: 'bulk_send' });
    expect(single).toMatchObject({ type: 'server_form', modal_style: 'mail_composer', permission: 'crm.write', action: 'crm.leads.email', handler: 'yaml_mutation', operation: 'send' });
    expect(bulk.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'subject', type: 'text', required: true }),
      expect.objectContaining({ field: 'body_html', type: 'mail_body' }),
      expect.objectContaining({ field: 'template_id', options_source: 'crm_lead_email_templates' }),
    ]));
    expect(single.mutation.fields).toContain('lead_id');
    expect(detailApi.datasources).toContainEqual(expect.objectContaining({ id: 'crm_lead_emails', permission: 'crm.read' }));
    expect(() => validatePageDefinition({ ...leadsPage, actions: [...leadsApi.actions, { id: 'view_lead', type: 'navigate', permission: 'crm.read', navigate_to: '/lead-detail' }] }, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...detailPage, actions: detailApi.actions }, { allowExternalSources: true })).not.toThrow();
  });

  test('sends single and selected lead email, audits chatter, guards failures, and survives restart', async () => {
    const databasePath = `/tmp/core3-crm-lead-email-${crypto.randomUUID()}.duckdb`;
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const first = new YamlRepository(firstDatabase);
      await migrateDatabase(first, join(root, 'migrations'), undefined, 'crm_lead_email_composer_migrations', ['schema', 'data']);
      await migrateDatabase(first, join(root, 'migrations'), undefined, 'crm_lead_email_composer_migrations', ['schema', 'data']);

      expect(await first.query("SELECT id, subject FROM crm_lead_mail_templates ORDER BY id")).toEqual([
        { id: 'crm-lead-mail-template-001', subject: 'Following up on your opportunity' },
        { id: 'crm-lead-mail-template-002', subject: 'Next steps for your proposal' },
      ]);
      expect(await first.query("SELECT id, recipient_email, state FROM crm_lead_mail_messages WHERE id = 'crm-lead-mail-demo-001'")).toEqual([
        { id: 'crm-lead-mail-demo-001', recipient_email: 'buyer@acme.test', state: 'Sent' },
      ]);

      const detailApi = yaml('api/lead-detail.yaml');
      const single = action(detailApi, 'send_lead_email_detail');
      const sent = await first.executeMutation(single.mutation, {
        lead_id: 'crm-demo-001',
        subject: 'Decision meeting follow-up',
        body_html: '<p>Thank you for the discussion.</p>',
        attachment_name: 'agenda.pdf',
        current_user_id: 'user-qa',
        current_user_name: 'QA User',
      }) as any;
      expect(sent).toMatchObject({ lead_id: 'crm-demo-001', recipient_email: 'buyer@acme.test', subject: 'Decision meeting follow-up', body_html: '<p>Thank you for the discussion.</p>', attachment_name: 'agenda.pdf', sent_by: 'QA User', state: 'Sent' });
      expect(await first.query("SELECT action, action_label, detail FROM (SELECT action, CASE action WHEN 'crm.email' THEN 'Email sent' ELSE action END AS action_label, detail, created_at FROM crm_activity_log WHERE resource = 'crm_leads' AND resource_id = 'crm-demo-001') WHERE action = 'crm.email' ORDER BY created_at DESC")).toEqual([
        { action: 'crm.email', action_label: 'Email sent', detail: 'Sent email to buyer@acme.test: Decision meeting follow-up' },
        { action: 'crm.email', action_label: 'Email sent', detail: 'Sent email to buyer@acme.test: Following up on your opportunity' },
      ]);

      const bulk = action(yaml('api/leads.yaml'), 'send_leads_email');
      await first.executeMutation(bulk.mutation, {
        selectedIds: ['crm-demo-001', 'crm-demo-002'],
        subject: 'CRM update',
        body_html: '<p>Here is your CRM update.</p>',
        template_id: null,
        current_user_id: 'user-qa',
        current_user_name: 'QA User',
      });
      expect(await first.query("SELECT lead_id, recipient_email, subject FROM crm_lead_mail_messages WHERE lead_id IN ('crm-demo-001', 'crm-demo-002') AND subject = 'CRM update' ORDER BY lead_id")).toEqual([
        { lead_id: 'crm-demo-001', recipient_email: 'buyer@acme.test', subject: 'CRM update' },
        { lead_id: 'crm-demo-002', recipient_email: 'ops@globex.test', subject: 'CRM update' },
      ]);
      expect(await first.query("SELECT COUNT(*) AS count FROM crm_lead_mail_messages WHERE lead_id IN ('crm-demo-001', 'crm-demo-002') AND subject = 'CRM update'")).toEqual([{ count: 2 }]);

      await first.run("UPDATE crm_leads SET email = '' WHERE id = 'crm-demo-002'");
      await expect(first.executeMutation(bulk.mutation, {
        selectedIds: ['crm-demo-002'], subject: 'No recipient', body_html: '<p>Message</p>', current_user_name: 'QA User',
      })).rejects.toMatchObject({ status: 422, code: 'CRM_LEAD_EMAIL_RECIPIENT_REQUIRED' });
      await expect(first.executeMutation(single.mutation, {
        lead_id: 'missing-lead', subject: 'Missing', body_html: '<p>Message</p>', current_user_name: 'QA User',
      })).rejects.toMatchObject({ status: 404, code: 'CRM_LEAD_EMAIL_LEAD_NOT_FOUND' });
      await first.run("UPDATE crm_leads SET stage = 'Lost' WHERE id = 'crm-demo-001'");
      await expect(first.executeMutation(single.mutation, {
        lead_id: 'crm-demo-001', subject: 'Closed', body_html: '<p>Message</p>', current_user_name: 'QA User',
      })).rejects.toMatchObject({ status: 409, code: 'CRM_LEAD_EMAIL_CLOSED' });
      await firstDatabase.close();

      const secondDatabase = await DuckDbDatabase.open(databasePath);
      const second = new YamlRepository(secondDatabase);
      expect(await second.query("SELECT recipient_email, subject, state FROM crm_lead_mail_messages WHERE lead_id = 'crm-demo-001' ORDER BY sent_at, id")).toEqual([
        { recipient_email: 'buyer@acme.test', subject: 'Following up on your opportunity', state: 'Sent' },
        { recipient_email: 'buyer@acme.test', subject: 'Decision meeting follow-up', state: 'Sent' },
        { recipient_email: 'buyer@acme.test', subject: 'CRM update', state: 'Sent' },
      ]);
      await secondDatabase.close();
    } finally {
      rmSync(databasePath, { force: true });
    }
  });
});
