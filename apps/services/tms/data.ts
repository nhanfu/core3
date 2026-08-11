import type { TmsRouteContext } from './api-route-context.ts';
import { declaredFromStates, findDeclaredMove } from '../../lib/workflow.ts';
import { readFileSync, writeFileSync } from 'node:fs';

export async function handleDataRoutes(ctx: TmsRouteContext): Promise<Response | null> {
  const {
    req, url, pathname, method, repository, authProvider, SOURCES, PAGES, CATALOGS, WORKFLOWS, WORKFLOW_FILES,
    UPLOAD_ROOT, reloadPages, authUser, activityActor, FINANCIAL_WORKFLOW_SCOPES,
    NAMED_ACTIONS, TABLES, requirePerm, permissionForEndpoint, permissionForAction,
    recordInCurrentBranch, branchForScopedResource, crmEntityInScope,
    configuredCurrencyRates, json, apiError, publicPageConfig, pageCacheHeaders, prefetchedPageConfig,
  } = ctx;

  // ── GET /api/pages/:id ────────────────────────────────────────────────────
  if (pathname === '/api/pages' && method === 'GET') {
    return json([...PAGES.values()].map((page) => publicPageConfig(page)));
  }

  const pageMatch = pathname.match(/^\/api\/pages\/([A-Za-z0-9_-]+)$/);
  if (pageMatch && method === 'GET') {
    if (url.searchParams.get('cache') !== 'true') reloadPages?.();
    const page = PAGES.get(pageMatch[1]);
    if (!page) return apiError(404, `Unknown page: ${pageMatch[1]}`);
    for (const permission of page.page?.auth?.require || []) requirePerm(permission);
    return json(await prefetchedPageConfig(page, url, authUser), 200, pageCacheHeaders(url));
  }

  // ── POST /api/query ───────────────────────────────────────────────────────
  if (pathname === '/api/query' && method === 'POST') {
    const vm = await req.json() as any;
    const src = SOURCES.get(vm.sourceId);
    if (!src) return apiError(404, `Unknown source: ${vm.sourceId}`);
    if (src.permission) requirePerm(src.permission);
    if (typeof src.workflow_states === 'string') {
      const workflow = WORKFLOWS.get(src.workflow_states);
      if (!workflow) return apiError(500, `Unknown workflow: ${src.workflow_states}`);
      return json({ data: workflow.states.map((state: any) => ({ value: state.id, label: state.label, color: state.color })), meta: {} });
    }
    const result = await repository.querySource(
      src,
      {
        ...(vm.params || {}),
        // These values are server-owned. Client filters cannot impersonate a
        // different branch or view scope.
        current_user_id: String(authUser.sub || ''),
        current_user_name: String(authUser.name || ''),
        current_branch_id: String(authUser.branch_id || ''),
        view_scope: String(authUser.view_scope || 'all'),
      },
      vm.skip || 0,
      vm.top || 25,
      typeof vm.facetField === 'string' ? vm.facetField : undefined,
      vm.sort,
      vm.pivot,
    );
    return json(result);
  }

  const workflowMatch = pathname.match(/^\/api\/datasources\/([A-Za-z0-9_-]+)\/workflow$/);
  if (workflowMatch && method === 'POST') {
    const source = SOURCES.get(workflowMatch[1]);
    const workflow = typeof source?.workflow === 'string' ? WORKFLOWS.get(source.workflow) : undefined;
    if (!workflow || workflow.handler !== 'order_status') return apiError(404, 'Unknown datasource workflow');
    const body = await req.json() as any;
    if (body.operation === 'add_status') {
      if (!workflow.allow_add) return apiError(403, 'Adding statuses is not allowed');
      requirePerm(String(workflow.permission));
      const label = typeof body.label === 'string' ? body.label.trim() : '';
      if (!label || label.length > 80 || /[\r\n]/.test(label)) return apiError(400, 'A valid status name is required');
      if (workflow.states.some((state: any) => String(state.id) === label || String(state.label) === label)) {
        return apiError(409, 'That status already exists');
      }
      const stateIds = new Set(workflow.states.map((state: any) => String(state.id)));
      const fromStates = normalizeWorkflowStates(body.from, stateIds);
      const toStates = normalizeWorkflowStates(body.to, stateIds);
      if (!fromStates.length && !toStates.length) return apiError(400, 'Choose at least one state transition');
      const workflowFile = WORKFLOW_FILES.get(String(source.workflow));
      if (!workflowFile) return apiError(500, 'Workflow file is not available');
      const state = { id: label, label, color: 'neutral' };
      const yaml = readFileSync(workflowFile, 'utf8');
      const marker = /^(\s*)transitions:\s*$/m;
      const match = yaml.match(marker);
      if (!match || match.index === undefined) return apiError(500, 'Workflow file has no transitions section');
      const line = `    - { id: ${JSON.stringify(label)}, label: ${JSON.stringify(label)}, color: neutral }`;
      const newline = yaml.includes('\r\n') ? '\r\n' : '\n';
      const transitions = [
        ...fromStates.map(from => ({ from, to: label })),
        ...toStates.map(to => ({ from: label, to })),
      ].map(({ from, to }, index) => `    - { id: ${JSON.stringify(uniqueTransitionId(workflow, from, to, index))}, from: ${JSON.stringify(from)}, to: ${JSON.stringify(to)}, permission: ${JSON.stringify(workflow.permission)} }`);
      const nextYaml = `${yaml.slice(0, match.index)}${line}${newline}${yaml.slice(match.index, match.index + match[0].length)}${newline}${transitions.join(newline)}${newline}${yaml.slice(match.index + match[0].length)}`;
      writeFileSync(workflowFile, nextYaml, 'utf8');
      workflow.states.push(state);
      workflow.transitions.push(...[
        ...fromStates.map(from => ({ id: uniqueTransitionId(workflow, from, label, 0), from, to: label, permission: workflow.permission })),
        ...toStates.map(to => ({ id: uniqueTransitionId(workflow, label, to, 0), from: label, to, permission: workflow.permission })),
      ]);
      return json(state, 201);
    }
    if (body.operation === 'edit_status') {
      if (!workflow.allow_add) return apiError(403, 'Editing statuses is not allowed');
      requirePerm(String(workflow.permission));
      const stateId = typeof body.id === 'string' ? body.id : '';
      const label = typeof body.label === 'string' ? body.label.trim() : '';
      const state = workflow.states.find((candidate: any) => String(candidate.id) === stateId);
      if (!state) return apiError(404, 'Unknown order status');
      if (!label || label.length > 80 || /[\r\n]/.test(label)) return apiError(400, 'A valid status name is required');
      if (workflow.states.some((candidate: any) => candidate !== state && String(candidate.label) === label)) return apiError(409, 'That status label already exists');
      const knownStates = new Set(workflow.states.map((candidate: any) => String(candidate.id)).filter((id: string) => id !== stateId));
      const fromStates = normalizeWorkflowStates(body.from, knownStates);
      const toStates = normalizeWorkflowStates(body.to, knownStates);
      if (!fromStates.length && !toStates.length) return apiError(400, 'Choose at least one state transition');
      const workflowFile = WORKFLOW_FILES.get(String(source.workflow));
      if (!workflowFile) return apiError(500, 'Workflow file is not available');
      const remaining = workflow.transitions.filter((transition: any) => {
        const from = Array.isArray(transition.from) ? transition.from : [transition.from];
        return transition.to !== stateId && !from.includes(stateId);
      });
      const usedIds = new Set(remaining.map((transition: any) => String(transition.id)));
      const newTransitions = [...fromStates.map(from => ({ from, to: stateId })), ...toStates.map(to => ({ from: stateId, to }))].map(({ from, to }) => {
        const base = `move_${slugWorkflowState(from)}_to_${slugWorkflowState(to)}`;
        let id = base;
        let suffix = 1;
        while (usedIds.has(id)) id = `${base}_${suffix++}`;
        usedIds.add(id);
        return { id, from, to, permission: workflow.permission };
      });
      const nextWorkflow = {
        ...workflow,
        states: workflow.states.map((candidate: any) => candidate === state ? { ...candidate, label } : candidate),
        transitions: [...remaining, ...newTransitions],
      };
      writeWorkflowYaml(workflowFile, nextWorkflow, stateId);
      state.label = label;
      workflow.transitions.splice(0, workflow.transitions.length, ...nextWorkflow.transitions);
      return json(state);
    }
    if (body.operation !== 'move' || typeof body.id !== 'string' || typeof body.status !== 'string') return apiError(400, 'id and status are required');
    if (!(await recordInCurrentBranch('orders', body.id))) return apiError(403, 'Order is outside the current view scope');
    if (!workflow.states.some((state: any) => state.id === body.status)) return apiError(400, 'Unknown order status');
    const [current] = await repository.query(
      `SELECT COALESCE(s.status, o.status) AS status
       FROM orders o LEFT JOIN order_workflow_states s ON s.order_id = o.id
       WHERE o.id = ?`,
      [body.id],
    );
    if (!current) return apiError(404, 'Order not found');
    const transition = findDeclaredMove(workflow.transitions || [], String(current.status), body.status);
    if (!transition) return apiError(409, 'This status transition is not allowed');
    requirePerm(String(transition.permission || workflow.permission));
    return json(await repository.transitionOrder(
      body.id,
      declaredFromStates(transition),
      transition.to,
      `orders.${transition.id}`,
      activityActor,
      transition.conditions,
      transition.condition_message,
    ));
  }


  return null;
}

function normalizeWorkflowStates(value: unknown, knownStates: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((candidate): candidate is string => typeof candidate === 'string' && knownStates.has(candidate)))];
}

function uniqueTransitionId(workflow: any, from: string, to: string, index: number): string {
  const base = `move_${slugWorkflowState(from)}_to_${slugWorkflowState(to)}`;
  const used = new Set((workflow.transitions || []).map((transition: any) => String(transition.id)));
  let id = base;
  let suffix = index || 1;
  while (used.has(id)) id = `${base}_${suffix++}`;
  return id;
}

function slugWorkflowState(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'state';
}

function writeWorkflowYaml(file: string, workflow: any, stateId: string): void {
  const yaml = readFileSync(file, 'utf8');
  const newline = yaml.includes('\r\n') ? '\r\n' : '\n';
  const transitionMatch = yaml.match(/^(\s*)transitions:\s*$/m);
  if (!transitionMatch || transitionMatch.index === undefined) throw { status: 500, message: 'Workflow file has no transitions section' };
  const beforeTransitions = yaml.slice(0, transitionMatch.index);
  const lines = beforeTransitions.split(/\r?\n/);
  const stateIndex = lines.findIndex(line => line.includes(`id: ${JSON.stringify(stateId)},`) || new RegExp(`id:\\s*${escapeRegExp(stateId)}\\s*(?:,|})`).test(line));
  if (stateIndex < 0) throw { status: 500, message: 'Workflow state is not present in the workflow file' };
  const currentLine = lines[stateIndex];
  const matchingState = workflow.states.find((candidate: any) => String(candidate.id) === stateId);
  if (!matchingState) throw { status: 500, message: 'Workflow state is not present in the workflow file' };
  const terminal = matchingState.terminal ? ', terminal: true' : '';
  lines[stateIndex] = `    - { id: ${JSON.stringify(String(matchingState.id))}, label: ${JSON.stringify(String(matchingState.label))}, color: ${JSON.stringify(String(matchingState.color || 'neutral'))}${terminal} }`;
  const prefix = lines.join(newline);
  const transitionLines = workflow.transitions.map((transition: any) => `    - { id: ${JSON.stringify(String(transition.id))}, from: ${JSON.stringify(transition.from)}, to: ${JSON.stringify(String(transition.to))}, permission: ${JSON.stringify(String(transition.permission))} }`);
  writeFileSync(file, `${prefix}${newline}transitions:${newline}${transitionLines.join(newline)}${newline}`, 'utf8');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
