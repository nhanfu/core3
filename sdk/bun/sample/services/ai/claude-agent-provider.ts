import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentProvider } from './api/ai-agent-contract.ts';
import { buildContextPrompt, OUTPUT_SCHEMA, parseAgentResponse } from './agent-prompt.ts';

export function createClaudeCliAgentProvider(options: { bin?: string; model?: string; timeoutMs?: number } = {}): AgentProvider {
  const bin = options.bin || 'claude';
  const timeoutMs = options.timeoutMs || 120_000;
  return {
    async generate(input) {
      const workspace = await mkdtemp(join(tmpdir(), 'core3-ai-claude-'));
      const promptFile = join(workspace, 'prompt.txt');
      try {
        // Embed schema instruction into the prompt so no arg exceeds OS limits.
        const fullPrompt = [
          buildContextPrompt(input),
          `Output schema (respond with JSON only, no other text):\n${JSON.stringify(OUTPUT_SCHEMA)}`,
        ].join('\n\n');
        await writeFile(promptFile, fullPrompt, 'utf8');
        const args = [
          '--print',
          '--output-format', 'text',
          '--input-format', 'text',
          '--dangerously-skip-permissions',
          ...(options.model ? ['--model', options.model] : []),
        ];
        const child = Bun.spawn([bin, ...args], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe', cwd: workspace });
        const stdoutPromise = new Response(child.stdout).text();
        const stderrPromise = new Response(child.stderr).text();
        const promptBytes = await Bun.file(promptFile).arrayBuffer();
        await child.stdin.write(new Uint8Array(promptBytes));
        child.stdin.end();
        const timeout = setTimeout(() => child.kill(), timeoutMs);
        const exitCode = await child.exited;
        clearTimeout(timeout);
        const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise]);
        if (exitCode !== 0) {
          throw { status: 502, code: 'AI_CLAUDE_CLI_FAILED', message: stderr.trim() || `Claude CLI exited with status ${exitCode}` };
        }
        return parseAgentResponse(stdout, 'Claude');
      } catch (failure: any) {
        if (failure?.code === 'AI_CLAUDE_CLI_FAILED') throw failure;
        throw {
          status: 502,
          code: 'AI_CLAUDE_CLI_FAILED',
          message: String(failure?.message || `Unable to start Claude CLI: ${bin}. Set CORE3_CLAUDE_BIN to the full executable path if needed.`),
        };
      } finally {
        await rm(workspace, { recursive: true, force: true });
      }
    },
  };
}
