import { existsSync, readdirSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentProvider } from './api/ai-agent-contract.ts';
import { buildContextPrompt, OUTPUT_SCHEMA, parseAgentResponse } from './agent-prompt.ts';

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
        await writeFile(promptFile, buildContextPrompt(input), 'utf8');
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
        return parseAgentResponse(output, 'Codex');
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
