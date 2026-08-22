export type WorkflowTransition<State extends string = string> = {
  from: readonly State[];
  to: State;
};

export type WorkflowDefinition<
  Action extends string = string,
  State extends string = string,
> = Record<Action, WorkflowTransition<State>>;

export type DeclaredWorkflowTransition = {
  id: string;
  from: string | readonly string[];
  to: string;
  permission: string;
  conditions?: WorkflowConditions;
  condition_message?: string;
};

export type WorkflowCondition = {
  field: string;
  operator: 'present' | 'equals' | 'not_equals' | 'greater_than' | 'greater_than_or_equal' | 'less_than' | 'less_than_or_equal' | 'in';
  value?: unknown;
};

export type WorkflowConditions = {
  all?: readonly WorkflowCondition[];
  any?: readonly WorkflowCondition[];
};

function conditionMatches(record: Record<string, unknown>, condition: WorkflowCondition): boolean {
  const actual = record[condition.field];
  switch (condition.operator) {
    case 'present': return actual !== undefined && actual !== null && actual !== '';
    case 'equals': return actual === condition.value;
    case 'not_equals': return actual !== condition.value;
    case 'greater_than': return Number(actual) > Number(condition.value);
    case 'greater_than_or_equal': return Number(actual) >= Number(condition.value);
    case 'less_than': return Number(actual) < Number(condition.value);
    case 'less_than_or_equal': return Number(actual) <= Number(condition.value);
    case 'in': return Array.isArray(condition.value) && condition.value.includes(actual);
  }
}

export function workflowConditionsMatch(record: Record<string, unknown>, conditions?: WorkflowConditions): boolean {
  if (!conditions) return true;
  const all = conditions.all?.every(condition => conditionMatches(record, condition)) ?? true;
  const any = conditions.any?.some(condition => conditionMatches(record, condition)) ?? true;
  return all && any;
}

function allowedFrom(transition: DeclaredWorkflowTransition): readonly string[] {
  return typeof transition.from === 'string' ? [transition.from] : transition.from;
}

export function findDeclaredTransition(
  transitions: readonly DeclaredWorkflowTransition[],
  id: string,
): DeclaredWorkflowTransition | undefined {
  return transitions.find(transition => transition.id === id);
}

export function findDeclaredMove(
  transitions: readonly DeclaredWorkflowTransition[],
  currentState: string,
  targetState: string,
): DeclaredWorkflowTransition | undefined {
  return transitions.find(transition => {
    const from = allowedFrom(transition);
    return (from.includes('*') || from.includes(currentState))
      && (transition.to === '*' || transition.to === targetState);
  });
}

export function declaredFromStates(transition: DeclaredWorkflowTransition): readonly string[] {
  return allowedFrom(transition);
}

export class WorkflowTransitionError extends Error {
  action: string;
  currentState: string;
  allowedStates: readonly string[];

  constructor(action: string, currentState: string, allowedStates: readonly string[]) {
    super(
      `Action "${action}" is not allowed from "${currentState}" `
      + `(expected ${allowedStates.join(' or ')})`,
    );
    this.name = 'WorkflowTransitionError';
    this.action = action;
    this.currentState = currentState;
    this.allowedStates = allowedStates;
  }
}

/**
 * Resolves named lifecycle actions without exposing target states to clients.
 * Persistence remains caller-owned so the transition and audit event can share
 * a transaction.
 */
export class StateWorkflow<
  Action extends string,
  State extends string,
> {
  definition: WorkflowDefinition<Action, State>;

  constructor(definition: WorkflowDefinition<Action, State>) {
    this.definition = definition;
  }

  transition(action: Action, currentState: State): State {
    const transition = this.get(action);
    if (!transition.from.includes(currentState)) {
      throw new WorkflowTransitionError(action, currentState, transition.from);
    }
    return transition.to;
  }

  get(action: Action): WorkflowTransition<State> {
    const transition = this.definition[action];
    if (!transition) throw new Error(`Unknown workflow action: ${action}`);
    return transition;
  }

  available(currentState: State): Action[] {
    return (Object.keys(this.definition) as Action[])
      .filter((action) => this.definition[action].from.includes(currentState));
  }
}
