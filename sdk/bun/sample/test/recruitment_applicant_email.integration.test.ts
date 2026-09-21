import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

async function openRepository(databasePath = ':memory:', migrationName = `recruitment_applicant_email_${crypto.randomUUID().replaceAll('-', '_')}`) {
  const database = await DuckDbDatabase.open(databasePath);
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
  return { database, repository, migrationName };
}

const message = {
  selectedIds: ['applicant-demo-002', 'applicant-demo-003'],
  current_company_name: 'Core3 Demo Company',
  current_user_name: 'Recruitment QA',
  subject: 'Application update',
  body_html: '<p>Thank you for your application.</p>',
  template_id: null,
  attachment_name: 'Recruitment information.pdf',
};

describe('Recruitment applicant email composer parity', () => {
  test('maps the Odoo bound Send Email action and keeps the page/API contract joined', () => {
    const page = yaml('pages/applicants.yaml');
    const api = yaml('api/applicants.yaml');
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr_recruitment/models/hr_applicant.py', 'utf8');
    const sourceWizard = readFileSync('/home/nhanjs/projects/odoo/addons/hr_recruitment/wizard/applicant_send_mail.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/hr_recruitment/views/hr_applicant_views.xml', 'utf8');
    const send = action(api, 'send_recruitment_applicant_email');

    expect(sourceModel).toContain("'res_model': 'applicant.send.mail'");
    expect(sourceModel).toContain("'default_applicant_ids': self.ids");
    expect(sourceWizard).toContain('def action_send(self):');
    expect(sourceWizard).toContain('without_emails');
    expect(sourceView).toContain('<field name="binding_view_types">list,kanban</field>');
    expect(sourceView).toContain('<field name="name">Send Email</field>');
    expect(page.page.id).toBe('applicants');
    expect(page.components[0]).toMatchObject({ selectable: true, bulk_actions: [{ id: 'send_recruitment_applicant_email', label: 'Send Email', permission: 'recruitment.write' }] });
    expect(api.page.id).toBe(page.page.id);
    expect(page.page.id).toBe(api.page.id);
    expect(api.datasources.map((source: any) => source.id)).toContain('recruitment_applicant_email_templates');
    expect(send).toMatchObject({ type: 'server_form', modal_style: 'mail_composer', permission: 'recruitment.write', operation: 'bulk_create', handler: 'yaml_mutation', title: 'Send Email' });
    expect(send.mutation.table).toBe('recruitment_applicant_mail_messages');
    expect(send.mutation.fields).toEqual(expect.arrayContaining(['subject', 'body_html', 'template_id', 'attachment_name']));
    expect(send.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'applicant_names', type: 'mail_recipient' }),
      expect.objectContaining({ field: 'body_html', type: 'mail_body' }),
      expect.objectContaining({ field: 'attachment_name', type: 'mail_attachment' }),
    ]));
  });

  test('sends to selected applicants, stores each message, and survives file-backed restart', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'core3-recruitment-applicant-email-'));
    const databasePath = join(tempDir, 'recruitment.duckdb');
    const first = await openRepository(databasePath);
    try {
      const send = action(yaml('api/applicants.yaml'), 'send_recruitment_applicant_email');
      const result = await first.repository.executeMutation(send.mutation, message) as any;
      expect(result).toMatchObject({ applicant_id: 'applicant-demo-003', recipient_email: 'emily@example.com', subject: 'Application update', attachment_name: 'Recruitment information.pdf', sent_by: 'Recruitment QA', state: 'Sent', row_version: 1 });
      expect(await first.repository.query('SELECT applicant_id, recipient_email, state FROM recruitment_applicant_mail_messages ORDER BY applicant_id')).toEqual([
        { applicant_id: 'applicant-demo-002', recipient_email: 'meldona@example.com', state: 'Sent' },
        { applicant_id: 'applicant-demo-003', recipient_email: 'emily@example.com', state: 'Sent' },
      ]);
    } finally {
      await first.database.close();
    }

    const second = await openRepository(databasePath);
    try {
      expect(await second.repository.query('SELECT subject, sent_by, attachment_name FROM recruitment_applicant_mail_messages ORDER BY applicant_id')).toEqual([
        { subject: 'Application update', sent_by: 'Recruitment QA', attachment_name: 'Recruitment information.pdf' },
        { subject: 'Application update', sent_by: 'Recruitment QA', attachment_name: 'Recruitment information.pdf' },
      ]);
    } finally {
      await second.database.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  }, 30000);

  test('uses an active template and rejects invalid content or inactive templates atomically', async () => {
    const { database, repository } = await openRepository();
    try {
      const send = action(yaml('api/applicants.yaml'), 'send_recruitment_applicant_email');
      const templated = await repository.executeMutation(send.mutation, { ...message, selectedIds: ['applicant-demo-001'], subject: '', body_html: '', template_id: 'recruitment-applicant-template-002' }) as any;
      expect(templated).toMatchObject({ applicant_id: 'applicant-demo-001', subject: 'Interview invitation', body_html: '<p>We would like to invite you to an interview.</p>', template_id: 'recruitment-applicant-template-002' });
      await repository.query("UPDATE recruitment_applicant_mail_templates SET active = FALSE WHERE id = 'recruitment-applicant-template-002'");
      await expect(repository.executeMutation(send.mutation, { ...message, selectedIds: ['applicant-demo-002'], subject: '', body_html: '', template_id: 'recruitment-applicant-template-002' })).rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_MAIL_CONTENT_INVALID' });
      await expect(repository.executeMutation(send.mutation, { ...message, selectedIds: ['applicant-demo-002'], subject: '', body_html: '', template_id: 'missing-template' })).rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_MAIL_CONTENT_INVALID' });
      await expect(repository.executeMutation(send.mutation, { ...message, selectedIds: ['applicant-demo-002'], subject: '', body_html: '' })).rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_MAIL_CONTENT_INVALID' });
      expect(await repository.query('SELECT COUNT(*) AS count FROM recruitment_applicant_mail_messages')).toEqual([{ count: 1 }]);
    } finally {
      await database.close();
    }
  });

  test('enforces selection, actor, missing email, company, and missing-record guards without partial writes', async () => {
    const { database, repository } = await openRepository();
    try {
      const send = action(yaml('api/applicants.yaml'), 'send_recruitment_applicant_email');
      await expect(repository.executeMutation(send.mutation, { ...message, selectedIds: [] })).rejects.toMatchObject({ status: 400, code: 'RECRUITMENT_MAIL_SELECTION_REQUIRED' });
      await expect(repository.executeMutation(send.mutation, { ...message, current_user_name: '' })).rejects.toMatchObject({ status: 403, code: 'RECRUITMENT_MAIL_ACTOR_REQUIRED' });
      await expect(repository.executeMutation(send.mutation, { ...message, selectedIds: ['missing-applicant'] })).rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_MAIL_APPLICANT_NOT_FOUND' });
      await expect(repository.executeMutation(send.mutation, { ...message, current_company_name: 'Other Company' })).rejects.toMatchObject({ status: 403, code: 'RECRUITMENT_MAIL_COMPANY_FORBIDDEN' });
      await repository.query("UPDATE recruitment_applicants SET email = NULL WHERE id = 'applicant-demo-003'");
      await expect(repository.executeMutation(send.mutation, { ...message, selectedIds: ['applicant-demo-003'] })).rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_MAIL_EMAIL_REQUIRED' });
      expect(await repository.query('SELECT COUNT(*) AS count FROM recruitment_applicant_mail_messages')).toEqual([{ count: 0 }]);
    } finally {
      await database.close();
    }
  });
});
