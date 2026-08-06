/// <reference types="node" />
/// <reference path="../../globals.d.ts" />

import { join } from 'node:path';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { xlsxToCsv } from './services/xlsx-import.ts';
import type { TmsRouteContext } from './api-route-context.ts';

export async function handleFileRoutes(ctx: TmsRouteContext): Promise<Response | null> {
  const {
    req, url, pathname, method, repository, authProvider, SOURCES, PAGES, CATALOGS,
    UPLOAD_ROOT, reloadPages, authUser, activityActor, FINANCIAL_WORKFLOW_SCOPES,
    NAMED_ACTIONS, TABLES, requirePerm, permissionForEndpoint, permissionForAction,
    recordInCurrentBranch, branchForScopedResource, crmEntityInScope,
    configuredCurrencyRates, json, apiError, pageCacheHeaders, prefetchedPageConfig, CORS_HEADERS, eventStore,
  } = ctx;

  if (pathname === '/api/upload' && method === 'POST') {
    const form = await req.formData();
    const file = form.get('file');
    let meta: any = {};
    try {
      meta = JSON.parse(String(form.get('meta') || '{}'));
    } catch {
      return apiError(400, 'Invalid upload metadata');
    }
    if (!(file instanceof File)) return apiError(400, 'file required');
    if (meta.kind !== 'chat_attachment' && meta.kind !== 'order_attachment' && meta.kind !== 'employee_document' && meta.kind !== 'contract_document' && meta.kind !== 'company_document' && meta.kind !== 'master_data_import') return apiError(400, 'Unsupported upload kind');
    if (meta.kind === 'chat_attachment') {
      requirePerm(permissionForEndpoint('upload.chat_attachment'));
      if (typeof meta.thread_id !== 'string' || !meta.thread_id) return apiError(400, 'thread_id required');
    } else if (meta.kind === 'order_attachment') {
      requirePerm(permissionForEndpoint('upload.order_attachment'));
      if (typeof meta.order_id !== 'string' || !meta.order_id) return apiError(400, 'order_id required');
      if (!(await recordInCurrentBranch('orders', meta.order_id))) return apiError(403, 'Order is outside the current view scope');
    } else if (meta.kind === 'employee_document') {
      requirePerm(permissionForEndpoint('upload.employee_document'));
      if (typeof meta.employee_id !== 'string' || !meta.employee_id) return apiError(400, 'employee_id required');
      if (!(await recordInCurrentBranch('employees', meta.employee_id))) return apiError(403, 'Record is outside the current view scope');
    } else if (meta.kind === 'contract_document') {
      requirePerm(permissionForEndpoint('upload.contract_document'));
      if (typeof meta.contract_id !== 'string' || !meta.contract_id) return apiError(400, 'contract_id required');
      if (!(await recordInCurrentBranch('employment_contracts', meta.contract_id))) return apiError(403, 'Record is outside the current view scope');
    } else if (meta.kind === 'company_document') {
      requirePerm(permissionForEndpoint('upload.company_document'));
      if (typeof meta.company_id !== 'string' || !meta.company_id) return apiError(400, 'company_id required');
    } else {
      requirePerm(permissionForEndpoint('upload.master_data_import'));
      if (typeof meta.scope !== 'string' || !meta.scope) return apiError(400, 'scope required');
      if (file.size > 2 * 1024 * 1024) return apiError(400, 'Import CSV or XLSX must be 2 MB or smaller');
      let importText: string;
      if (file.name.toLowerCase().endsWith('.xlsx') || file.type.includes('spreadsheetml')) {
        try {
          importText = xlsxToCsv(new Uint8Array(await file.arrayBuffer()));
        } catch (error) {
          return apiError(400, error instanceof Error ? error.message : 'Invalid XLSX workbook');
        }
      } else {
        importText = await file.text();
      }
      const result = await repository.importMasterData(meta.scope, importText, activityActor);
      return json(result);
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      return apiError(400, 'Attachment must be between 1 byte and 5 MB');
    }

    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-120) || 'attachment';
    const storageKey = `${crypto.randomUUID()}-${safeName}`;
    mkdirSync(UPLOAD_ROOT, { recursive: true });
    const targetPath = join(UPLOAD_ROOT, storageKey);
    writeFileSync(targetPath, Buffer.from(await file.arrayBuffer()));
    try {
      const fileMeta = { fileName: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size, storageKey };
      if (meta.kind === 'order_attachment') return json(await repository.createOrderAttachment(meta.order_id, fileMeta, activityActor));
      if (meta.kind === 'employee_document') return json(await repository.createEmployeeDocument(meta.employee_id, fileMeta, activityActor));
      if (meta.kind === 'contract_document') return json(await repository.createContractDocument(meta.contract_id, fileMeta, activityActor));
      if (meta.kind === 'company_document') return json(await repository.createCompanyDocument(meta.company_id, fileMeta, activityActor));
      const result = await repository.sendChatAttachment(meta.thread_id, meta.content, fileMeta, activityActor);
      try {
        await eventStore?.publish({
          operation: 'send_attachment',
          status: 'success',
          actorId: String(activityActor.id || ''),
          threadId: result.thread_id,
          messageId: result.id,
          message: result,
        });
      } catch (error) {
        console.error('[chat] attachment event publish failed:', error);
      }
      return json(result);
    } catch (error) {
      try {
        unlinkSync(targetPath);
      } catch {}
      throw error;
    }
  }

  const contractDocumentMatch = pathname.match(/^\/api\/hr\/contract-documents\/([A-Za-z0-9-]+)$/);
  if (contractDocumentMatch && method === 'GET') {
    requirePerm(permissionForEndpoint('hr.contract_document.download'));
    const document = await repository.getContractDocument(contractDocumentMatch[1]);
    if (!document) return apiError(404, 'Contract document not found');
    if (!(await recordInCurrentBranch('employment_contracts', String(document.contract_id)))) return apiError(403, 'Record is outside the current view scope');
    const file = Bun.file(join(UPLOAD_ROOT, document.storage_key));
    if (!(await file.exists())) return apiError(404, 'Contract document file not found');
    return new Response(file, { headers: { 'Content-Type': document.mime_type || 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(document.file_name)}`, ...CORS_HEADERS } });
  }

  const companyDocumentMatch = pathname.match(/^\/api\/org\/company-documents\/([A-Za-z0-9-]+)$/);
  if (companyDocumentMatch && method === 'GET') {
    requirePerm(permissionForEndpoint('org.company_document.download'));
    const document = await repository.getCompanyDocument(companyDocumentMatch[1]);
    if (!document) return apiError(404, 'Company document not found');
    const file = Bun.file(join(UPLOAD_ROOT, document.storage_key));
    if (!(await file.exists())) return apiError(404, 'Company document file not found');
    return new Response(file, { headers: { 'Content-Type': document.mime_type || 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(document.file_name)}`, ...CORS_HEADERS } });
  }

  const employeeDocumentMatch = pathname.match(/^\/api\/hr\/employee-documents\/([A-Za-z0-9-]+)$/);
  if (employeeDocumentMatch && method === 'GET') {
    requirePerm(permissionForEndpoint('hr.employee_document.download'));
    const document = await repository.getEmployeeDocument(employeeDocumentMatch[1]);
    if (!document) return apiError(404, 'Employee document not found');
    if (!(await recordInCurrentBranch('employees', String(document.employee_id)))) return apiError(403, 'Record is outside the current view scope');
    const file = Bun.file(join(UPLOAD_ROOT, document.storage_key));
    if (!(await file.exists())) return apiError(404, 'Employee document file not found');
    return new Response(file, { headers: { 'Content-Type': document.mime_type || 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(document.file_name)}`, ...CORS_HEADERS } });
  }

  const attachmentMatch = pathname.match(/^\/api\/chat\/attachments\/([A-Za-z0-9-]+)$/);
  if (attachmentMatch && method === 'GET') {
    requirePerm(permissionForEndpoint('chat.attachment.download'));
    const attachment = await repository.getChatAttachment(
      attachmentMatch[1],
      String(authUser.sub),
    );
    if (!attachment) return apiError(404, 'Attachment not found');
    const file = Bun.file(join(UPLOAD_ROOT, attachment.storage_key));
    if (!(await file.exists())) return apiError(404, 'Attachment file not found');
    return new Response(file, {
      headers: {
        'Content-Type': attachment.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(attachment.file_name)}`,
        ...CORS_HEADERS,
      },
    });
  }

  const orderAttachmentMatch = pathname.match(/^\/api\/orders\/attachments\/([A-Za-z0-9-]+)$/);
  if (orderAttachmentMatch && method === 'GET') {
    requirePerm(permissionForEndpoint('orders.attachment.download'));
    const attachment = await repository.getOrderAttachment(orderAttachmentMatch[1]);
    if (!attachment) return apiError(404, 'Order attachment not found');
    if (!(await recordInCurrentBranch('orders', String(attachment.order_id)))) return apiError(403, 'Order is outside the current view scope');
    const file = Bun.file(join(UPLOAD_ROOT, attachment.storage_key));
    if (!(await file.exists())) return apiError(404, 'Order attachment file not found');
    return new Response(file, {
      headers: {
        'Content-Type': attachment.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(attachment.file_name)}`,
        ...CORS_HEADERS,

      },
    });
  }


  return null;
}
