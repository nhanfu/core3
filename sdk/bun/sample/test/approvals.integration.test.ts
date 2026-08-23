import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages } from '@core3/server/discovery';

const approvalsRoot = join(import.meta.dir, '../services/approvals');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(approvalsRoot, file), 'utf8')) as any;

function action(page: any, id: string) {
  return page.actions.find((candidate: any) => candidate.id === id);
}

describe('Approvals YAML module integration', () => {
  it('discovers the module with every declared action permission', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.permissions.get('approvals')?.config.permissions).toEqual([
      'approvals.read', 'approvals.write', 'approvals.manage', 'approvals.attachment.download',
    ]);
    expect(discovered.pages.has('approvals')).toBe(true);
    expect(discovered.workflows.has('approval_requests')).toBe(true);
  });

  it('derives protected request fields and enforces assigned, unique approvers', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await repository.run(`
      CREATE TABLE approval_types(
        id VARCHAR PRIMARY KEY, name VARCHAR, description VARCHAR, responsible_name VARCHAR,
        approvers VARCHAR, approver_ids VARCHAR, required_approvals INTEGER, state VARCHAR DEFAULT 'Active', row_version BIGINT DEFAULT 1, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE approval_requests(
        id VARCHAR PRIMARY KEY, name VARCHAR, approval_type_id VARCHAR, approval_type_name VARCHAR DEFAULT '',
        requester_name VARCHAR DEFAULT '', date_requested DATE DEFAULT CURRENT_DATE, reason VARCHAR,
        approvers VARCHAR DEFAULT '', approver_ids VARCHAR DEFAULT '', required_approvals INTEGER DEFAULT 1,
        approved_count INTEGER DEFAULT 0, last_approver VARCHAR, state VARCHAR DEFAULT 'Draft',
        row_version BIGINT DEFAULT 1, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE approval_votes(
        id VARCHAR PRIMARY KEY, request_id VARCHAR, approver_id VARCHAR, approver_name VARCHAR,
        voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(request_id, approver_id)
      );
      CREATE TABLE approval_attachments(
        id VARCHAR PRIMARY KEY, request_id VARCHAR, file_name VARCHAR, mime_type VARCHAR,
        size_bytes BIGINT, storage_key VARCHAR, uploaded_by VARCHAR, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const typesPage = yaml('pages/types.yaml');
    const requestsPage = yaml('pages/requests.yaml');
    const workflow = yaml('pages/approval-workflow.yaml').workflow;
    const create = action(requestsPage, 'create_approval_request').mutation;
    const submit = workflow.transitions.find((transition: any) => transition.id === 'submit').mutation;
    const recordApproval = workflow.transitions.find((transition: any) => transition.id === 'record_approval').mutation;
    const finalApproval = workflow.transitions.find((transition: any) => transition.id === 'approve').mutation;
    const detailPage = yaml('pages/request-detail.yaml');
    const uploadAttachment = action(detailPage, 'upload_approval_attachment');
    const editType = action(typesPage, 'edit_approval_type').mutation;
    const editRequest = action(requestsPage, 'edit_approval_request').mutation;

    await repository.executeMutation(action(typesPage, 'create_approval_type').mutation, {
      id: 'purchase',
      values: {
        name: 'Purchase', description: 'Purchases', responsible_name: 'Finance',
        approvers: 'Finance, Operations', approver_ids: 'approver-a,approver-b', required_approvals: 2,
      },
    });

    const created = await repository.executeMutation(create, {
      id: 'request-1', current_user_name: 'Requester',
      values: {
        name: 'APR-1', approval_type_id: 'purchase', requester_name: 'Spoofed requester',
        approval_type_name: 'Spoofed type', approvers: 'attacker', approver_ids: 'attacker',
        required_approvals: 1, reason: 'Buy scanners',
      },
    });
    expect(created).toMatchObject({
      approval_type_name: 'Purchase', requester_name: 'Requester',
      approvers: 'Finance, Operations', approver_ids: 'approver-a,approver-b', required_approvals: 2,
    });
    await repository.executeMutation(editType, {
      id: 'purchase', expected_row_version: 1,
      values: { name: 'Purchase request', description: 'Updated', responsible_name: 'Finance', approvers: 'Finance, Operations', approver_ids: 'approver-a,approver-b', required_approvals: 2 },
    });
    await repository.executeMutation(editRequest, {
      id: 'request-1', expected_row_version: 1,
      values: { name: 'APR-1-updated', date_requested: '2026-08-23', reason: 'Buy better scanners' },
    });
    expect(await repository.query('SELECT name, reason FROM approval_requests WHERE id = ?', ['request-1']))
      .toEqual([{ name: 'APR-1-updated', reason: 'Buy better scanners' }]);

    const attachment = await repository.executeMutation(uploadAttachment.mutation, {
      request_id: 'request-1', current_user_id: 'requester', current_user_name: 'Requester',
      fileName: 'quote.pdf', mimeType: 'application/pdf', sizeBytes: 2048, storageKey: 'stored/quote.pdf',
    });
    expect(attachment).toMatchObject({ file_name: 'quote.pdf', uploaded_by: 'requester' });
    expect(await repository.query('SELECT storage_key FROM approval_attachments WHERE id = ?', [attachment.id]))
      .toEqual([{ storage_key: 'stored/quote.pdf' }]);
    await expect(repository.executeMutation(uploadAttachment.mutation, {
      request_id: 'missing', current_user_id: 'requester', current_user_name: 'Requester',
      fileName: 'bad.pdf', mimeType: 'application/pdf', sizeBytes: 1, storageKey: 'stored/bad.pdf',
    })).rejects.toMatchObject({ status: 404 });

    await repository.executeMutation(submit, { id: 'request-1', current_user_id: 'requester', current_user_name: 'Requester' });
    await repository.executeMutation(recordApproval, { id: 'request-1', current_user_id: 'approver-a', current_user_name: 'Finance' });
    await expect(repository.executeMutation(recordApproval, { id: 'request-1', current_user_id: 'approver-a', current_user_name: 'Finance' })).rejects.toMatchObject({ status: 403 });
    await expect(repository.executeMutation(recordApproval, { id: 'request-1', current_user_id: 'attacker', current_user_name: 'Attacker' })).rejects.toMatchObject({ status: 403 });

    await repository.executeMutation(finalApproval, { id: 'request-1', current_user_id: 'approver-b', current_user_name: 'Operations' });
    expect(await repository.query('SELECT state, approved_count FROM approval_requests WHERE id = ?', ['request-1']))
      .toEqual([{ state: 'Approved', approved_count: 2 }]);
    expect(await repository.query('SELECT COUNT(*) AS count FROM approval_votes WHERE request_id = ?', ['request-1']))
      .toEqual([{ count: 2 }]);
    database.close();
  });
});
