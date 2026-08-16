/// <reference types="node" />

import { join } from 'node:path';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import type { TopicMediator } from '../topics/mediator.ts';
import { topicDefinition } from '../topics/contracts.ts';
import { bindNamedParams } from '@core3/server/database/sql';

export async function handleFileRoutes(ctx: Record<string, any>): Promise<Response | null> {
  const {
    req, pathname, method, repository, NAMED_ACTIONS, topics, UPLOAD_ROOT, authUser, activityActor,
    requirePerm, permissionForEndpoint, recordInCurrentBranch, json, apiError,
    CORS_HEADERS, eventStore, STORAGE,
  } = ctx;

  if (pathname === '/api/upload' && method === 'POST') {
    const form = await req.formData();
    const file = form.get('file');
    let meta: any;
    try { meta = JSON.parse(String(form.get('meta') || '{}')); } catch { return apiError(400, 'Invalid upload metadata'); }
    if (!(file instanceof File)) return apiError(400, 'file required');
    const action = Object.values(NAMED_ACTIONS || {}).find((candidate: any) => candidate.type === 'upload' && candidate.kind === meta.kind) as any;
    if (!action) return apiError(400, 'Unsupported upload kind');
    requirePerm(String(action.permission || permissionForEndpoint(`upload.${meta.kind}`)));
    const scope = action.mutation?.scope;
    const scopeId = meta.order_id || meta.id || meta.resource_id;
    if (scope && scopeId && !(await recordInCurrentBranch(String(scope.table || ''), String(scopeId)))) return apiError(403, 'Record is outside the current view scope');
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) return apiError(400, 'Attachment must be between 1 byte and 5 MB');

    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-120) || 'attachment';
    const storageKey = `${crypto.randomUUID()}-${safeName}`;
    mkdirSync(UPLOAD_ROOT, { recursive: true });
    const targetPath = join(UPLOAD_ROOT, storageKey);
    writeFileSync(targetPath, Buffer.from(await file.arrayBuffer()));
    try {
      const fileMeta = { fileName: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size, storageKey };
      if (!action.topic) {
        if (!action?.mutation) return apiError(500, 'Order attachment mutation is not configured');
        return json(await repository.executeMutation(action.mutation, {
          ...meta,
          ...fileMeta,
          current_user_id: activityActor.id || null,
          current_user_name: activityActor.name,
          current_branch_id: String(authUser.branch_id || ''),
          view_scope: String(authUser.view_scope || 'all'),
        }));
      }
      if (!action?.topic) return apiError(500, 'Chat attachment topic is not configured');
      const result: any = await (topics as TopicMediator).request(topicDefinition(action.topic, Number(action.topic_version || 1)), {
        threadId: meta.thread_id,
        content: meta.content,
        expected_row_version: meta.expected_row_version,
        attachment: fileMeta,
        actor: activityActor,
      });
      await eventStore?.publish({ operation: 'send_attachment', status: 'success', actorId: String(activityActor.id || ''), threadId: result.thread_id, messageId: result.id, message: result });
      return json(result);
    } catch (error) {
      try { unlinkSync(targetPath); } catch { /* cleanup is best effort */ }
      throw error;
    }
  }

  const attachment = Object.entries(STORAGE?.attachments || {})
    .map(([kind, value]: [string, any]) => ({ kind, rule: value?.download }))
    .find(({ rule }) => typeof rule?.route === 'string' && pathname.startsWith(`${rule.route}/`));
  if (attachment && method === 'GET') {
    const id = pathname.slice(String(attachment.rule.route).length + 1).match(/^[A-Za-z0-9-]+$/)?.[0];
    const rule = attachment.rule;
    if (!id) return apiError(404, 'Attachment not found');
    if (!rule?.query) return null;
    requirePerm(String(rule.permission || ''));
    const bound = bindNamedParams(String(rule.query), { attachment_id: id, user_id: String(authUser.sub || '') });
    const [fileRecord] = await repository.query(bound.statement, bound.values);
    if (!fileRecord) return apiError(404, 'Attachment not found');
    if (rule.scope && !(await recordInCurrentBranch(String(rule.scope.table || ''), String(fileRecord[rule.scope.resource_id || 'order_id'] || fileRecord.order_id)))) return apiError(403, 'Record is outside the current view scope');
    const file = Bun.file(join(UPLOAD_ROOT, fileRecord.storage_key));
    if (!(await file.exists())) return apiError(404, 'Attachment file not found');
    return new Response(file, { headers: {
      'Content-Type': fileRecord.mime_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileRecord.file_name)}`,
      ...CORS_HEADERS,
    }});
  }

  return null;
}
