export type WorkflowTransition<State extends string = string> = {
  from: readonly State[];
  to: State;
};

export type WorkflowDefinition<
  Action extends string = string,
  State extends string = string,
> = Record<Action, WorkflowTransition<State>>;

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
