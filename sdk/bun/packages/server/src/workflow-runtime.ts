import { findDeclaredMove } from '@core3/client/workflow';
import type { MutationDefinition } from './yaml-mutation-runtime.ts';

export type WorkflowMoveDefinition = {
  status_query?: string;
  scope?: Record<string, unknown>;
  default_mutation?: MutationDefinition;
  transitions?: Array<Record<string, unknown>>;
};

export class WorkflowRuntime {
  constructor(private readonly repository: { query(sql: string, params?: unknown[]): Promise<any[]>; executeMutation(definition: MutationDefinition, input: Record<string, unknown>): Promise<unknown> }) {}

  async move(workflow: WorkflowMoveDefinition, input: { id: string; status: string; expected_row_version?: unknown; current_user_id?: string | null; current_user_name?: string; current_branch_id?: string; view_scope?: string }, authorize?: (transition: any) => void): Promise<unknown> {
    if (!workflow.status_query?.trim()) throw { status: 500, message: 'Workflow status query is not configured' };
    const [current] = await this.repository.query(workflow.status_query, [input.id]);
    if (!current) throw { status: 404, message: 'Order not found' };
    const transition = findDeclaredMove(workflow.transitions || [], String(current.status), input.status);
    if (!transition) throw { status: 409, message: 'This status transition is not allowed' };
    authorize?.(transition);
    const mutation = transition.mutation || workflow.default_mutation;
    if (!mutation) throw { status: 500, message: `Workflow transition is missing a mutation: ${transition.id}` };
    const guardedMutation: MutationDefinition = {
      ...mutation,
      scope: workflow.scope,
      guards: [{
        query: 'SELECT id FROM orders WHERE id = :id AND row_version = :expected_row_version',
        status: 409,
        code: 'STALE_RECORD',
        message: 'Order was changed by another user. Reload it before changing status.',
      }, ...(mutation.guards || [])],
      steps: [...(mutation.steps || []), {
        query: 'UPDATE orders SET row_version = row_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = :id AND row_version = :expected_row_version',
        expect_changed: true,
        code: 'STALE_RECORD',
      }],
    };
    return this.repository.executeMutation(guardedMutation, {
      ...input,
      current_status: String(current.status),
      target_status: String(transition.to),
    });
  }
}
