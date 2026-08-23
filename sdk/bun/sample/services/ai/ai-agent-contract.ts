export type AgentPart =
  | { type: 'text'; markdown: string }
  | { type: 'activity'; label: string; status: 'running' | 'success' | 'failed' }
  | { type: 'preview'; title: string; preview_id: string; summary: Record<string, unknown>; page?: string; context?: Record<string, unknown> }
  | { type: 'approval'; preview_id: string; action_label: string; warning?: string }
  | { type: 'result'; title: string; summary: Record<string, unknown> }
  | { type: 'technical_details'; operation: string; request?: unknown; response?: unknown };

export type AgentApiCall = {
  operation: string;
  values?: Record<string, unknown>;
  preview?: boolean;
  requires_confirmation?: boolean;
};

export type AgentProviderRequest = {
  prompt: string;
  user: { id: string; name: string; roles?: string[]; permissions: string[] };
  yaml_context: Array<{ path: string; content: string }>;
  operations?: Array<{ id: string; route: string; method?: string; permission: string; preview?: boolean; read_only?: boolean; datasource?: string }>;
  pages?: Array<{ id: string; title?: string; permissions: string[] }>;
  datasources?: Array<{ id: string; permission?: string; query?: string; workflow?: string }>;
};

export type AgentProviderResponse = {
  parts: AgentPart[];
  calls?: AgentApiCall[];
};

export interface AgentProvider {
  generate(input: AgentProviderRequest): Promise<AgentProviderResponse>;
}
