import type { AgentProviderRequest, AgentProviderResponse } from './api/ai-agent-contract.ts';

export const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['parts', 'calls'],
  properties: {
    parts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'type', 'markdown', 'label', 'status', 'title', 'preview_id', 'summary', 'page',
          'context', 'action_label', 'warning', 'operation', 'request', 'response',
          'stage', 'iteration', 'max_iterations', 'actions_used', 'max_actions',
          'elapsed_ms', 'max_duration_ms', 'remaining_budget', 'stop_reason',
        ],
        properties: {
          type: { type: 'string', enum: ['text', 'activity', 'run_status', 'preview', 'approval', 'result', 'technical_details'] },
          markdown: { type: ['string', 'null'] },
          label: { type: ['string', 'null'] },
          status: { type: ['string', 'null'], enum: ['running', 'success', 'failed', null] },
          title: { type: ['string', 'null'] },
          preview_id: { type: ['string', 'null'] },
          summary: { type: ['object', 'null'], additionalProperties: false },
          page: { type: ['string', 'null'] },
          context: { type: ['object', 'null'], additionalProperties: false },
          action_label: { type: ['string', 'null'] },
          warning: { type: ['string', 'null'] },
          operation: { type: ['string', 'null'] },
          request: { type: ['string', 'null'] },
          response: { type: ['string', 'null'] },
          stage: { type: ['string', 'null'] },
          iteration: { type: ['number', 'null'] },
          max_iterations: { type: ['number', 'null'] },
          actions_used: { type: ['number', 'null'] },
          max_actions: { type: ['number', 'null'] },
          elapsed_ms: { type: ['number', 'null'] },
          max_duration_ms: { type: ['number', 'null'] },
          remaining_budget: { type: ['number', 'null'] },
          stop_reason: { type: ['string', 'null'] },
        },
      },
    },
    calls: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['operation', 'values', 'preview', 'requires_confirmation'],
        properties: {
          operation: { type: 'string' },
          values: {
            type: ['array', 'null'],
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['key', 'value'],
              properties: { key: { type: 'string' }, value: { type: 'string' } },
            },
          },
          preview: { type: ['boolean', 'null'] },
          requires_confirmation: { type: ['boolean', 'null'] },
        },
      },
    },
  },
} as const;

export const SYSTEM_INSTRUCTIONS = [
  'You are the Core3 business-rule assistant. You are a planner and API-operation selector only.',
  'Use only the supplied YAML and declared operation list. Do not invent operation IDs, routes, permissions, or business rules.',
  'Do not execute commands, modify files, call APIs, or access anything outside the supplied context.',
  'Return only JSON matching the supplied output schema.',
  'Explain the result in parts. You may return a run_status part whenever a task has stages or bounded repair work; expose only limits and counters you actually know, and include stop_reason when the run stops. For a page request, return a preview part with the matching page ID from the supplied page catalog. Use a preview part for data that the user should inspect before an import or other mutation.',
  'Every declared call will be permission-checked by Core3. Read-only datasource queries may run immediately and should be used to inspect data. Mutations always require confirmation; never claim that a mutation completed. Encode call values as key/value entries, with each value as a JSON string.',
  'YAML discovery: use the yaml.search operation (values: [{key:"query",value:"<keywords>"}]) to find relevant YAML files before answering questions about pages, actions, or business rules you have not yet seen. Only call it when the supplied YAML context does not already answer the question.',
].join('\n');

function promptKeywords(prompt: string): Set<string> {
  return new Set(prompt.toLowerCase().match(/\b\w{3,}\b/g) || []);
}

function scoreItem(keywords: Set<string>, ...fields: (string | undefined)[]): number {
  const text = fields.filter(Boolean).join(' ').toLowerCase();
  let score = 0;
  for (const kw of keywords) if (text.includes(kw)) score++;
  return score;
}

function relevantSlice<T>(items: T[], score: (item: T) => number, max: number): T[] {
  if (items.length <= max) return items;
  const scored = items.map((item) => ({ item, score: score(item) })).sort((a, b) => b.score - a.score);
  const matches = scored.filter((x) => x.score > 0).slice(0, max);
  if (matches.length >= 5) return matches.map((x) => x.item);
  return scored.slice(0, max).map((x) => x.item);
}

export function buildContextPrompt(input: AgentProviderRequest): string {
  const keywords = promptKeywords(input.prompt);
  const allOps = input.operations || [];
  const allPages = input.pages || [];
  const allDatasources = input.datasources || [];

  const operations = relevantSlice(allOps, (op: any) => scoreItem(keywords, op.id, op.permission), 30);
  const pages = relevantSlice(allPages, (p: any) => scoreItem(keywords, p.id, p.title), 20);
  const datasources = relevantSlice(allDatasources, (d: any) => scoreItem(keywords, d.id, d.query, d.workflow), 10);

  const yaml = input.yaml_context.map((entry) => `--- ${entry.path}\n${entry.content}`).join('\n');
  return [
    SYSTEM_INSTRUCTIONS,
    `Current user: ${JSON.stringify(input.user)}`,
    `User request:\n${input.prompt}`,
    `Declared operations (${operations.length} of ${allOps.length} shown):\n${JSON.stringify(operations, null, 2)}`,
    `Accessible page catalog (${pages.length} of ${allPages.length} shown):\n${JSON.stringify(pages, null, 2)}`,
    `Accessible YAML datasources (${datasources.length} of ${allDatasources.length} shown):\n${JSON.stringify(datasources, null, 2)}`,
    `YAML business context:\n${yaml}`,
  ].join('\n\n');
}

export function parseAgentResponse(value: string, fallbackAgent = 'Agent'): AgentProviderResponse {
  try {
    const parsed = JSON.parse(value) as AgentProviderResponse;
    if (parsed && Array.isArray(parsed.parts) && Array.isArray(parsed.calls)) {
      return {
        ...parsed,
        calls: parsed.calls.map((call: any) => ({
          ...call,
          values: Array.isArray(call.values)
            ? Object.fromEntries(
                call.values
                  .filter((entry: any) => entry && typeof entry.key === 'string')
                  .map((entry: any) => {
                    try { return [entry.key, JSON.parse(String(entry.value))]; } catch { return [entry.key, entry.value]; }
                  }),
              )
            : call.values,
        })),
      };
    }
  } catch {
    // Fall through to a readable response when the CLI returns non-JSON text.
  }
  return { parts: [{ type: 'text', markdown: value.trim() || `${fallbackAgent} returned no response.` }], calls: [] };
}
