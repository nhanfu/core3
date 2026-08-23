import { existsSync, readdirSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentProvider, AgentProviderRequest, AgentProviderResponse } from './ai-agent-contract.ts';

const OUTPUT_SCHEMA = {
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
        ],
        properties: {
          type: { type: 'string', enum: ['text', 'activity', 'preview', 'approval', 'result', 'technical_details'] },
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

function contextPrompt(input: AgentProviderRequest) {
  const operations = JSON.stringify(input.operations || [], null, 2);
  const yaml = input.yaml_context.map((entry) => `--- ${entry.path}\n${entry.content}`).join('\n');
  return [
    'You are the Core3 business-rule assistant. You are a planner and API-operation selector only.',
    'Use only the supplied YAML and declared operation list. Do not invent operation IDs, routes, permissions, or business rules.',
    'Do not execute commands, modify files, call APIs, or access anything outside the supplied context.',
    'Return only JSON matching the supplied output schema.',
    'Explain the result in parts. For a page request, return a preview part with the matching page ID from the supplied page catalog. Use a preview part for data that the user should inspect before an import or other mutation.',
    'Every declared call will be permission-checked by Core3. Read-only datasource queries may run immediately and should be used to inspect data. Mutations always require confirmation; never claim that a mutation completed. Encode call values as key/value entries, with each value as a JSON string.',
    `Current user: ${JSON.stringify(input.user)}`,
    `User request:\n${input.prompt}`,
    `Declared operations:\n${operations}`,
    `Accessible page catalog:\n${JSON.stringify(input.pages || [], null, 2)}`,
    `Accessible YAML datasources:\n${JSON.stringify(input.datasources || [], null, 2)}`,
    `YAML business context:\n${yaml}`,
  ].join('\n\n');
}

function parseResponse(value: string): AgentProviderResponse {
  try {
    const parsed = JSON.parse(value) as AgentProviderResponse;
    if (parsed && Array.isArray(parsed.parts) && Array.isArray(parsed.calls)) {
      return {
        ...parsed,
        calls: parsed.calls.map((call: any) => ({
          ...call,
          values: Array.isArray(call.values)
            ? Object.fromEntries(call.values.filter((entry: any) => entry && typeof entry.key === 'string').map((entry: any) => {
              try { return [entry.key, JSON.parse(String(entry.value))]; } catch { return [entry.key, entry.value]; }
            }))
            : call.values,
        })),
      };
    }
  } catch {
    // Fall through to a readable response when the CLI returns non-JSON text.
  }
  return { parts: [{ type: 'text', markdown: value.trim() || 'Codex returned no response.' }], calls: [] };
}

function resolveCodexBin(configured: string) {
  if (configured !== 'codex' || process.platform !== 'win32') return configured;
  const userProfile = process.env.USERPROFILE || process.env.HOME || '';
  const extensionRoot = join(userProfile, '.vscode', 'extensions');
  try {
    const candidates = readdirSync(extensionRoot)
      .filter((name) => name.startsWith('openai.chatgpt-'))
      .sort()
      .reverse()
      .map((name) => join(extensionRoot, name, 'bin', 'windows-x86_64', 'codex.exe'))
      .filter((path) => existsSync(path));
    if (candidates[0]) return candidates[0];
  } catch {
    // Fall back to PATH so custom Codex installations still work.
  }
  return configured;
}

export function createCodexCliAgentProvider(options: { bin?: string; model?: string; timeoutMs?: number } = {}): AgentProvider {
  const bin = resolveCodexBin(options.bin || 'codex');
  const timeoutMs = options.timeoutMs || 120_000;
  return {
    async generate(input) {
      const workspace = await mkdtemp(join(tmpdir(), 'core3-ai-agent-'));
      const promptFile = join(workspace, 'prompt.txt');
      const outputFile = join(workspace, 'response.json');
      const schemaFile = join(workspace, 'output-schema.json');
      try {
        await writeFile(promptFile, contextPrompt(input), 'utf8');
        await writeFile(schemaFile, JSON.stringify(OUTPUT_SCHEMA), 'utf8');
        const args = [
          'exec',
          '--ephemeral',
          '--sandbox', 'read-only',
          '--skip-git-repo-check',
          '--output-schema', schemaFile,
          '--output-last-message', outputFile,
          ...(options.model ? ['--model', options.model] : []),
          '-C', workspace,
          '-',
        ];
        const child = Bun.spawn([bin, ...args], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' });
        const stdoutPromise = new Response(child.stdout).text();
        const stderrPromise = new Response(child.stderr).text();
        await child.stdin.write(await readFile(promptFile));
        child.stdin.end();
        const timeout = setTimeout(() => child.kill(), timeoutMs);
        const exitCode = await child.exited;
        clearTimeout(timeout);
        const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise]);
        if (exitCode !== 0) {
          throw { status: 502, code: 'AI_CODEX_CLI_FAILED', message: stderr.trim() || `Codex CLI exited with status ${exitCode}` };
        }
        const output = await readFile(outputFile, 'utf8').catch(() => stdout);
        return parseResponse(output);
      } catch (failure: any) {
        if (failure?.code === 'AI_CODEX_CLI_FAILED') throw failure;
        throw {
          status: 502,
          code: 'AI_CODEX_CLI_FAILED',
          message: String(failure?.message || `Unable to start Codex CLI: ${bin}. Set CORE3_CODEX_BIN to the full executable path if needed.`),
        };
      } finally {
        await rm(workspace, { recursive: true, force: true });
      }
    },
  };
}
