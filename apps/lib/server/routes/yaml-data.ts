import { translationMap } from '../discovery.ts';
import { requestLanguage } from '../locale.ts';
import { WorkflowRuntime } from '../workflow-runtime.ts';
import { readFileSync, writeFileSync } from 'node:fs';
import { executeYamlMutation } from '../../yaml/mutation.ts';

export async function handleDataRoutes(ctx: Record<string, any>): Promise<Response | null> {
  const { req, url, pathname, method, repository, SOURCES, PAGES, CATALOGS, WORKFLOWS, WORKFLOW_FILES,
    reloadPages, authUser, activityActor, requirePerm, recordInCurrentBranch,
    json, apiError, publicPageConfig, pageCacheHeaders, prefetchedPageConfig } = ctx;

  if (pathname === '/api/pages' && method === 'GET') {
    return json([...PAGES.values()].map((page: any) => publicPageConfig(page)));
  }

  const pageMatch = pathname.match(/^\/api\/pages\/([A-Za-z0-9_-]+)$/);
  if (pageMatch && method === 'GET') {
    if (url.searchParams.get('cache') !== 'true') reloadPages?.();
    const page = PAGES.get(pageMatch[1]);
    if (!page) return apiError(404, `Unknown page: ${pageMatch[1]}`);
    for (const permission of page.page?.auth?.require || []) requirePerm(permission);
    return json(await prefetchedPageConfig(page, url, authUser), 200, pageCacheHeaders(url));
  }

  if (pathname === '/api/query' && method === 'POST') {
    const vm = await req.json() as any;
    const source = SOURCES.get(vm.sourceId);
    if (!source) return apiError(404, `Unknown source: ${vm.sourceId}`);
    if (source.permission) requirePerm(source.permission);
    if (typeof source.workflow_states === 'string') {
      const workflow = WORKFLOWS.get(source.workflow_states);
      if (!workflow) return apiError(500, `Unknown workflow: ${source.workflow_states}`);
      const labels = translationMap(CATALOGS, requestLanguage(url, authUser.preferred_lang || 'en'), 'order-workflow');
      return json({ data: workflow.states.map((state: any) => ({ value: state.id, label: labels[state.label] || state.label, color: state.color })), meta: {} });
    }
    return json(await repository.querySource(source, {
      ...(vm.params || {}),
      current_user_id: String(authUser.sub || ''),
      current_user_name: String(authUser.name || ''),
      current_branch_id: String(authUser.branch_id || ''),
      view_scope: String(authUser.view_scope || 'all'),
    }, vm.skip || 0, vm.top || 25, typeof vm.facetField === 'string' ? vm.facetField : undefined, vm.sort, vm.pivot));
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
      if (workflow.states.some((state: any) => String(state.id) === label || String(state.label) === label)) return apiError(409, 'That status already exists');
      const stateIds = new Set<string>(workflow.states.map((state: any) => String(state.id)));
      const fromStates = normalizeStates(body.from, stateIds);
      const toStates = normalizeStates(body.to, stateIds);
      if (!fromStates.length && !toStates.length) return apiError(400, 'Choose at least one state transition');
      const workflowFile = WORKFLOW_FILES.get(String(source.workflow));
      if (!workflowFile) return apiError(500, 'Workflow file is not available');
      const mutation = workflow.mutations?.add_status;
      if (!mutation) return apiError(500, 'Workflow add_status mutation is not configured');
      const next = executeYamlMutation({ workflow }, mutation, { label, from: fromStates, to: toStates, permission: workflow.permission }) as any;
      writeWorkflowSections(workflowFile, next.workflow);
      workflow.states.splice(0, workflow.states.length, ...next.workflow.states);
      workflow.transitions.splice(0, workflow.transitions.length, ...next.workflow.transitions);
      return json({ id: label, label, color: 'neutral' }, 201);
    }
    if (body.operation === 'edit_status') {
      if (!workflow.allow_add || workflow.state_editor?.allow_edit === false) return apiError(403, 'Editing statuses is not allowed');
      requirePerm(String(workflow.permission));
      const stateId = typeof body.id === 'string' ? body.id : '';
      const label = typeof body.label === 'string' ? body.label.trim() : '';
      const state = workflow.states.find((candidate: any) => String(candidate.id) === stateId);
      if (!state) return apiError(404, 'Unknown order status');
      if (!label || label.length > 80 || /[\r\n]/.test(label)) return apiError(400, 'A valid status name is required');
      if (workflow.states.some((candidate: any) => candidate !== state && String(candidate.label) === label)) return apiError(409, 'That status label already exists');
      const knownStates = new Set<string>(workflow.states.map((candidate: any) => String(candidate.id)).filter((id: string) => id !== stateId));
      const fromStates = normalizeStates(body.from, knownStates);
      const toStates = normalizeStates(body.to, knownStates);
      if (!fromStates.length && !toStates.length) return apiError(400, 'Choose at least one state transition');
      const workflowFile = WORKFLOW_FILES.get(String(source.workflow));
      if (!workflowFile) return apiError(500, 'Workflow file is not available');
      const remaining = workflow.transitions.filter((candidate: any) => {
        const from = Array.isArray(candidate.from) ? candidate.from : [candidate.from];
        return candidate.to !== stateId && !from.includes(stateId);
      });
      const usedIds = new Set(remaining.map((candidate: any) => String(candidate.id)));
      const nextTransitions = [
        ...fromStates.map(from => ({ from, to: stateId })),
        ...toStates.map(to => ({ from: stateId, to })),
      ].map(({ from, to }) => {
        const base = `move_${slugWorkflowState(from)}_to_${slugWorkflowState(to)}`;
        let id = base;
        let suffix = 1;
        while (usedIds.has(id)) id = `${base}_${suffix++}`;
        usedIds.add(id);
        return { id, from, to, permission: workflow.permission };
      });
      const mutation = workflow.mutations?.edit_status;
      if (!mutation) return apiError(500, 'Workflow edit_status mutation is not configured');
      const next = executeYamlMutation({ workflow }, mutation, {
        states: workflow.states.map((candidate: any) => candidate === state ? { ...candidate, label } : candidate),
        transitions: [...remaining, ...nextTransitions],
      }) as any;
      writeWorkflowSections(workflowFile, next.workflow);
      state.label = label;
      workflow.transitions.splice(0, workflow.transitions.length, ...next.workflow.transitions);
      return json(state);
    }
    if (body.operation === 'delete_status') {
      if (!workflow.state_editor?.allow_delete) return apiError(403, 'Deleting statuses is not allowed');
      requirePerm(String(workflow.permission));
      const stateId = typeof body.id === 'string' ? body.id : '';
      const replacement = typeof body.replacement === 'string' ? body.replacement : '';
      const state = workflow.states.find((candidate: any) => String(candidate.id) === stateId);
      if (!state) return apiError(404, 'Unknown order status');
      if (stateId === String(workflow.initial)) return apiError(409, 'The initial status cannot be deleted');
      if (!workflow.states.some((candidate: any) => String(candidate.id) === replacement) || replacement === stateId) return apiError(400, 'A valid replacement status is required');
      const workflowFile = WORKFLOW_FILES.get(String(source.workflow));
      if (!workflowFile) return apiError(500, 'Workflow file is not available');
      const states = workflow.states.filter((candidate: any) => String(candidate.id) !== stateId);
      const transitions = workflow.transitions.filter((candidate: any) => {
        const from = Array.isArray(candidate.from) ? candidate.from : [candidate.from];
        return candidate.to !== stateId && !from.includes(stateId);
      });
      const mutation = workflow.mutations?.delete_status;
      if (!mutation || !mutation.database) return apiError(500, 'Workflow delete_status database migration is not configured');
      const next = executeYamlMutation({ workflow }, mutation, { states, transitions }) as any;
      await repository.executeMutation(mutation.database, {
        from_status: stateId,
        to_status: replacement,
        current_user_id: activityActor.id || null,
        current_user_name: activityActor.name,
      });
      writeWorkflowSections(workflowFile, next.workflow);
      workflow.states.splice(0, workflow.states.length, ...next.workflow.states);
      workflow.transitions.splice(0, workflow.transitions.length, ...next.workflow.transitions);
      return json({ deleted: stateId, reassigned_to: replacement });
    }
    if (body.operation !== 'move' || typeof body.id !== 'string' || typeof body.status !== 'string') return apiError(400, 'id and status are required');
    if (workflow.scope?.table && !(await recordInCurrentBranch(String(workflow.scope.table), body.id))) return apiError(403, workflow.scope.message || 'Record is outside the current view scope');
    const runtime = new WorkflowRuntime(repository);
    const result = await runtime.move(workflow, {
      id: body.id,
      status: body.status,
      current_user_id: activityActor.id || null,
      current_user_name: activityActor.name,
      current_branch_id: String(authUser.branch_id || ''),
      view_scope: String(authUser.view_scope || 'all'),
    }, (transition) => requirePerm(String(transition.permission || workflow.permission)));
    return json(result);
  }

  return null;
}

function normalizeStates(value: unknown, known: Set<string>): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((candidate): candidate is string => typeof candidate === 'string' && known.has(candidate)))] : [];
}

function slugWorkflowState(value: unknown): string {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'state';
}

function writeWorkflowSections(file: string, workflow: any): void {
  const source = readFileSync(file, 'utf8');
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = source.split(/\r?\n/);
  const statesIndex = lines.findIndex(line => /^\s{2}states:\s*$/.test(line));
  const transitionsIndex = lines.findIndex(line => /^\s{2}transitions:\s*$/.test(line));
  if (statesIndex < 0 || transitionsIndex <= statesIndex) throw { status: 500, message: 'Workflow file has no writable states and transitions sections' };
  const states = (workflow.states || []).map((state: any) => `    - ${flowObject(state)}`);
  const transitions = (workflow.transitions || []).map((transition: any) => `    - ${flowObject(transition)}`);
  lines.splice(transitionsIndex + 1, lines.length - transitionsIndex - 1, ...transitions);
  lines.splice(statesIndex + 1, transitionsIndex - statesIndex - 1, ...states);
  writeFileSync(file, `${lines.join(newline).replace(/[\r\n]*$/, '')}${newline}`, 'utf8');
}

function flowObject(value: Record<string, unknown>): string {
  return `{ ${Object.entries(value).map(([key, entry]) => `${key}: ${JSON.stringify(entry)}`).join(', ')} }`;
}
