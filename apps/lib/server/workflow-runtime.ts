import { findDeclaredMove } from '../workflow.ts';
import type { MutationDefinition } from './yaml-mutation-runtime.ts';

export type WorkflowMoveDefinition = {
  status_query?: string;
  scope?: Record<string, unknown>;
  default_mutation?: MutationDefinition;
  transitions?: Array<Record<string, unknown>>;
};

export class WorkflowRuntime {
  constructor(private readonly repository: { query(sql: string, params?: unknown[]): Promise<any[]>; executeMutation(definition: MutationDefinition, input: Record<string, unknown>): Promise<unknown> }) {}

  async move(workflow: WorkflowMoveDefinition, input: { id: string; status: string; current_user_id?: string | null; current_user_name?: string; current_branch_id?: string; view_scope?: string }, authorize?: (transition: any) => void): Promise<unknown> {
    if (!workflow.status_query?.trim()) throw { status: 500, message: 'Workflow status query is not configured' };
    const [current] = await this.repository.query(workflow.status_query, [input.id]);
    if (!current) throw { status: 404, message: 'Order not found' };
    const transition = findDeclaredMove(workflow.transitions || [], String(current.status), input.status);
    if (!transition) throw { status: 409, message: 'This status transition is not allowed' };
    authorize?.(transition);
    const mutation = transition.mutation || workflow.default_mutation;
    if (!mutation) throw { status: 500, message: `Workflow transition is missing a mutation: ${transition.id}` };
    return this.repository.executeMutation({ ...mutation, scope: workflow.scope }, {
      ...input,
      current_status: String(current.status),
      target_status: String(transition.to),
    });
  }
}
