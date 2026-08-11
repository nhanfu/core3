/// <reference types="node" />
/// <reference path="../../globals.d.ts" />

import { join } from 'node:path';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';

const UPLOAD_KINDS = new Set(['chat_attachment', 'order_attachment']);

export async function handleFileRoutes(ctx: Record<string, any>): Promise<Response | null> {
  const {
    req, url, pathname, method, repository, UPLOAD_ROOT, authUser, activityActor,
    requirePerm, permissionForEndpoint, recordInCurrentBranch, json, apiError,
    CORS_HEADERS, eventStore,
  } = ctx;

  if (pathname === '/api/upload' && method === 'POST') {
    const form = await req.formData();
    const file = form.get('file');
    let meta: any;
    try { meta = JSON.parse(String(form.get('meta') || '{}')); } catch { return apiError(400, 'Invalid upload metadata'); }
    if (!(file instanceof File)) return apiError(400, 'file required');
    if (!UPLOAD_KINDS.has(meta.kind)) return apiError(400, 'Unsupported upload kind');
    if (meta.kind === 'chat_attachment') {
      requirePerm(permissionForEndpoint('upload.chat_attachment'));
      if (typeof meta.thread_id !== 'string' || !meta.thread_id) return apiError(400, 'thread_id required');
    } else {
      requirePerm(permissionForEndpoint('upload.order_attachment'));
      if (typeof meta.order_id !== 'string' || !meta.order_id) return apiError(400, 'order_id required');
      if (!(await recordInCurrentBranch('orders', meta.order_id))) return apiError(403, 'Order is outside the current view scope');
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) return apiError(400, 'Attachment must be between 1 byte and 5 MB');

    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-120) || 'attachment';
    const storageKey = `${crypto.randomUUID()}-${safeName}`;
    mkdirSync(UPLOAD_ROOT, { recursive: true });
    const targetPath = join(UPLOAD_ROOT, storageKey);
    writeFileSync(targetPath, Buffer.from(await file.arrayBuffer()));
    try {
      const fileMeta = { fileName: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size, storageKey };
      if (meta.kind === 'order_attachment') return json(await repository.createOrderAttachment(meta.order_id, fileMeta, activityActor));
      const result = await repository.sendChatAttachment(meta.thread_id, meta.content, fileMeta, activityActor);
      await eventStore?.publish({ operation: 'send_attachment', status: 'success', actorId: String(activityActor.id || ''), threadId: result.thread_id, messageId: result.id, message: result });
      return json(result);
    } catch (error) {
      try { unlinkSync(targetPath); } catch {}
      throw error;
    }
  }

  const attachment = pathname.match(/^\/api\/(chat|orders)\/attachments\/([A-Za-z0-9-]+)$/);
  if (attachment && method === 'GET') {
    const kind = attachment[1];
    const id = attachment[2];
    requirePerm(permissionForEndpoint(kind === 'chat' ? 'chat.attachment.download' : 'orders.attachment.download'));
    const fileRecord = kind === 'chat'
      ? await repository.getChatAttachment(id, String(authUser.sub))
      : await repository.getOrderAttachment(id);
    if (!fileRecord) return apiError(404, 'Attachment not found');
    if (kind === 'orders' && !(await recordInCurrentBranch('orders', String(fileRecord.order_id)))) return apiError(403, 'Order is outside the current view scope');
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
