import { orderWorkflow } from './services/order-workflow.ts';
import { financialWorkflow } from './services/financial-workflow.ts';
import { payrollWorkflow, quoteWorkflow } from './services/business-workflow.ts';
import type { TmsRouteContext } from './api-route-context.ts';
import { chatMessageQueue } from './chat-queue.ts';

export async function handleActionRoutes(ctx: TmsRouteContext): Promise<Response | null> {
  const {
    req, url, pathname, method, repository, authProvider, SOURCES, PAGES, CATALOGS,
    UPLOAD_ROOT, reloadPages, authUser, activityActor, FINANCIAL_WORKFLOW_SCOPES,
    NAMED_ACTIONS, TABLES, requirePerm, permissionForEndpoint, permissionForAction,
    recordInCurrentBranch, branchForScopedResource, crmEntityInScope,
    configuredCurrencyRates, json, apiError, pageCacheHeaders, prefetchedPageConfig,
  } = ctx;

  // ── POST /api/actions/:name ───────────────────────────────────────────────
  const namedActionMatch = pathname.match(/^\/api\/actions\/([A-Za-z0-9_.-]+)$/);
  if (namedActionMatch && method === 'POST') {
    const actionName = namedActionMatch[1];
    const actionDefinition = NAMED_ACTIONS[actionName];
    if (!actionDefinition) return apiError(404, `Unknown action: ${actionName}`);
    const handler = actionDefinition.handler;
    requirePerm(permissionForAction(actionName));

    const body = await req.json() as any;
    if (actionDefinition.mutation) {
      const mutationBody = Object.fromEntries(
        Object.entries(body && typeof body === 'object' ? body : {})
          .filter(([, value]) => value === null || ['boolean', 'number', 'string'].includes(typeof value)),
      );
      const result = await repository.executeMutation(actionDefinition.mutation, {
        ...mutationBody,
        thread_id: typeof body?.id === 'string' ? body.id : '',
        current_user_id: String(authUser.sub || ''),
        current_user_name: activityActor.name,
      });
      if (handler === 'chat') {
        chatMessageQueue.publish({
          operation: String(actionDefinition.operation || 'changed'),
          threadId: typeof body?.id === 'string' ? body.id : undefined,
        });
      }
      return json(result);
    }
    if (handler === 'currency_sync') {
      const configured = configuredCurrencyRates();
      return json(await repository.syncCurrencyRates(configured.rates, configured.source, activityActor));
    }
    if (handler === 'crm_entity') {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      if (body.kind !== 'customer' && body.kind !== 'partner') return apiError(400, 'Invalid CRM entity kind');
      if (!(await crmEntityInScope(body.kind, body.id))) return apiError(403, 'Record is outside the current view scope');
      const values = body.values && typeof body.values === 'object' ? body.values : {};
      const table = body.kind === 'customer' ? 'customers' : 'partners';
      const fields = body.kind === 'customer'
        ? ['code', 'name', 'tax_code', 'phone', 'email', 'stage', 'owner_name', 'visibility', 'status']
        : ['code', 'name', 'tax_code', 'phone', 'email', 'partner_type', 'owner_name', 'visibility', 'status'];
      const changes = fields
        .filter((field) => Object.prototype.hasOwnProperty.call(values, field))
        .map((field) => ({ field, value: values[field] }));
      if (!changes.some((change) => change.field === 'code' && String(change.value || '').trim())) return apiError(400, 'code required');
      if (!changes.some((change) => change.field === 'name' && String(change.value || '').trim())) return apiError(400, 'name required');
      if (body.kind === 'customer' && !['Lead', 'Contacting', 'Customer'].includes(String(values.stage || ''))) return apiError(400, 'Invalid customer stage');
      if (body.kind === 'partner' && !['Carrier', 'Supplier', 'ShippingLine', 'Warehouse', 'Depot', 'Other'].includes(String(values.partner_type || ''))) return apiError(400, 'Invalid partner type');
      if (!['Public', 'Private'].includes(String(values.visibility || ''))) return apiError(400, 'Invalid visibility');
      if (!['Active', 'Inactive'].includes(String(values.status || ''))) return apiError(400, 'Invalid status');
      const updated = await repository.updateRecord(table, body.id, changes, true);
      if (!updated) return apiError(404, 'CRM entity not found');
      await repository.recordActivity({
        actorId: activityActor.id,
        actorName: activityActor.name,
        action: 'update',
        resource: table,
        resourceId: body.id,
        detail: `Updated fields: ${changes.map((change) => change.field).join(', ')}`,
      });
      return json(updated);
    }
    if (handler === 'accounting_document') {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      if (!FINANCIAL_WORKFLOW_SCOPES.has(String(body.kind))) return apiError(400, 'Invalid financial document kind');
      if (!(await recordInCurrentBranch('accounting_entries', body.id))) return apiError(403, 'Record is outside the current view scope');
      const [existing] = await repository.query('SELECT kind, status FROM accounting_entries WHERE id = ?', [body.id]);
      if (!existing || existing.kind !== body.kind) return apiError(404, 'Financial document not found');
      if (existing.status !== 'Draft') return apiError(409, `Financial document cannot be edited while ${existing.status}`);
      const values = body.values && typeof body.values === 'object' ? body.values : {};
      const fields = ['code', 'name', 'counterparty', 'currency', 'document_date', 'due_date', 'description'];
      const changes = fields
        .filter((field) => Object.prototype.hasOwnProperty.call(values, field))
        .map((field) => ({ field, value: values[field] }));
      if (!changes.some((change) => change.field === 'code' && String(change.value || '').trim())) return apiError(400, 'code required');
      if (!changes.some((change) => change.field === 'name' && String(change.value || '').trim())) return apiError(400, 'name required');
      if (!changes.some((change) => change.field === 'currency' && String(change.value || '').trim())) return apiError(400, 'currency required');
      const updated = await repository.updateRecord('accounting_entries', body.id, changes, true);
      if (!updated) return apiError(404, 'Financial document not found');
      await repository.recordActivity({
        actorId: activityActor.id,
        actorName: activityActor.name,
        action: 'update',
        resource: 'accounting_entries',
        resourceId: body.id,
        detail: `Updated fields: ${changes.map((change) => change.field).join(', ')}`,
      });
      return json(updated);
    }
    if (handler === 'chat') {
      if (actionDefinition.operation === 'create_thread') {
        return json(await repository.createChatThread(
          body.values && typeof body.values === 'object' ? body.values : {},
          activityActor,
        ));
      }
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      return apiError(400, 'Invalid chat operation');
    }
    if (handler === 'contact') {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      const domain = actionDefinition.domain === 'crm'
        ? body.kind
        : actionDefinition.domain;
      if (domain !== 'customer' && domain !== 'partner') {
        return apiError(400, 'Invalid CRM contact kind');
      }
      if (!(await crmEntityInScope(domain, body.id))) return apiError(403, 'Record is outside the current view scope');
      const isCustomer = domain === 'customer';
      return json(await repository.mutateCrmContact(
        isCustomer
          ? {
              parentTable: 'customers',
              contactTable: 'customer_contacts',
              parentKey: 'customer_id',
              label: 'Customer',
            }
          : {
              parentTable: 'partners',
              contactTable: 'partner_contacts',
              parentKey: 'partner_id',
              label: 'Partner',
            },
        actionDefinition.operation,
        body.id,
        typeof body.contact_id === 'string' ? body.contact_id : null,
        body.values && typeof body.values === 'object' ? body.values : {},
        actionName,
        activityActor,
      ));
    }
    if (handler === 'approval_step') {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      return json(await repository.mutateApprovalFlowStep(
        actionDefinition.operation,
        body.id,
        typeof body.step_id === 'string' ? body.step_id : null,
        body.values && typeof body.values === 'object' ? body.values : {},
        actionName,
        activityActor,
      ));
    }
    if (handler === 'trip_transition') {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      return json(await repository.transitionTrip(body.id, actionDefinition.operation, actionName, activityActor));
    }
    if (handler === 'print_template') {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      return json(await repository.mutatePrintTemplateBlock(
        actionDefinition.operation,

        body.id,
        typeof body.block_id === 'string' ? body.block_id : null,
        body.values && typeof body.values === 'object' ? body.values : {},
        actionName,
        activityActor,
      ));
    }
    if (handler === 'code_rule_preview') {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      const [rule] = await repository.query("SELECT code, prefix, config_value, sequence_width, reset_cadence, next_sequence FROM system_configs WHERE id = ? AND kind = 'code_rule'", [body.id]);
      if (!rule) return apiError(404, 'Code rule not found');
      const prefix = String(rule.prefix || rule.config_value || rule.code || 'CODE');
      const width = Math.max(1, Math.min(12, Number(rule.sequence_width) || 4));
      const sequence = String(Number(rule.next_sequence) || 1).padStart(width, '0');
      const year = new Date().getUTCFullYear();
      return json({ preview: prefix.replace('{YYYY}', String(year)).replace(/\{SEQ(?::\d+)?\}/g, sequence), reset_cadence: rule.reset_cadence || 'never' });
    }
    if (handler === 'role_permission') {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      if (typeof body.permission_key !== 'string' || !body.permission_key) return apiError(400, 'permission_key required');
      return json(await repository.mutateRolePermission(actionDefinition.operation, body.id, body.permission_key, actionName, activityActor));
    }
    if (handler === 'user_role') {
      if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');
      if (typeof body.role_id !== 'string' || !body.role_id) return apiError(400, 'role_id required');
      if (!(await recordInCurrentBranch('users', body.id))) return apiError(403, 'User is outside the current view scope');
      return json(await repository.mutateUserRole(actionDefinition.operation, body.id, body.role_id, actionName, activityActor));
    }
    if (typeof body.id !== 'string' || !body.id) return apiError(400, 'id required');

    if (handler === 'line_item') {
      const isOrder = actionDefinition.domain === 'order';
      const isQuote = actionDefinition.domain === 'quote';
      if (!isOrder && !isQuote && !(await recordInCurrentBranch('accounting_entries', body.id))) {
        return apiError(403, 'Record is outside the current view scope');
      }
      if (isOrder && !(await recordInCurrentBranch('orders', body.id))) return apiError(403, 'Record is outside the current view scope');
      if (isQuote && !(await recordInCurrentBranch('quotes', body.id))) return apiError(403, 'Record is outside the current view scope');
      return json(await repository.mutateDocumentLine(
        isOrder
          ? {
              parentTable: 'orders',
              lineTable: 'order_lines',
              parentKey: 'order_id',
              label: 'Order',
              hasCost: false,
              totalField: 'total_amount',
            }
          : isQuote ? {
              parentTable: 'quotes',
              lineTable: 'quote_lines',
              parentKey: 'quote_id',
              label: 'Quote',
              hasCost: true,
              totalField: 'amount',
            } : {
              parentTable: 'accounting_entries',
              lineTable: 'accounting_entry_lines',
              parentKey: 'entry_id',
              label: 'Financial document',
              hasCost: false,
              totalField: 'amount',
            },
        actionDefinition.operation,
        body.id,
        typeof body.line_id === 'string' ? body.line_id : null,
        body.values && typeof body.values === 'object' ? body.values : {},
        actionName,
        activityActor,
      ));
    }

    if (handler === 'order_transition') {
      if (!(await recordInCurrentBranch('orders', body.id))) return apiError(403, 'Record is outside the current view scope');
      const transition = orderWorkflow.get(actionDefinition.operation);
      const order = await repository.transitionOrder(
        body.id,
        transition.from,
        transition.to,
        actionName,
        activityActor,
      );
      return json(order);
    }

    if (handler === 'order_chatter') {
      if (!(await recordInCurrentBranch('orders', body.id))) return apiError(403, 'Order is outside the current view scope');
      if (actionDefinition.operation === 'follower_add' || actionDefinition.operation === 'follower_remove') {
        if (typeof body.user_id !== 'string' || !body.user_id) return apiError(400, 'user_id required');
        if (actionDefinition.operation === 'follower_add' && String(authUser.view_scope || 'all') !== 'all') {
          const [candidate] = await repository.query('SELECT id FROM users WHERE id = ? AND enabled = true AND branch_id = ?', [body.user_id, String(authUser.branch_id || '')]);
          if (!candidate) return apiError(403, 'Follower is outside the current view scope');
        }
        return json(await repository.mutateOrderFollower(body.id, actionDefinition.operation, body.user_id, activityActor));
      }
      if (actionDefinition.operation !== 'message' && actionDefinition.operation !== 'note') return apiError(400, 'Invalid order chatter operation');
      return json(await repository.addOrderChatterEntry(
        body.id,
        actionDefinition.operation,
        body.values && typeof body.values === 'object' ? body.values : {},
        activityActor,
      ));
    }

    if (handler === 'financial_transition') {
      if (!(await recordInCurrentBranch('accounting_entries', body.id))) return apiError(403, 'Record is outside the current view scope');
      const transition = financialWorkflow.get(actionDefinition.operation);
      const document = await repository.transitionAccountingEntry(
        body.id,
        actionDefinition.kind,
        transition.from,
        transition.to,
        actionName,
        activityActor,
      );
      return json(document);
    }

    if (handler === 'business_transition' && actionDefinition.domain === 'quote') {
      if (!(await recordInCurrentBranch('quotes', body.id))) return apiError(403, 'Record is outside the current view scope');
      const transition = quoteWorkflow.get(actionDefinition.operation);
      return json(await repository.transitionBusinessRecord(
        { table: 'quotes', label: 'Quote' },
        body.id,
        transition.from,
        transition.to,
        actionName,
        activityActor,
      ));
    }

    if (!(await recordInCurrentBranch('payrolls', body.id))) return apiError(403, 'Record is outside the current view scope');
    const transition = payrollWorkflow.get(actionDefinition.operation);
    return json(await repository.transitionBusinessRecord(
      { table: 'payrolls', label: 'Payroll' },
      body.id,
      transition.from,
      transition.to,
      actionName,
      activityActor,
    ));
  }


  return null;
}
