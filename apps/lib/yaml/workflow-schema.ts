export type WorkflowStateDefinition = {
  id: string;
  label: string;
  color?: string;
  terminal?: boolean;
};

export type WorkflowConditionDefinition = {
  field: string;
  operator: 'present' | 'equals' | 'not_equals' | 'greater_than' | 'greater_than_or_equal' | 'less_than' | 'less_than_or_equal' | 'in';
  value?: unknown;
};

export type WorkflowTransitionDefinition = {
  id: string;
  from: string | string[];
  to: string;
  permission: string;
  conditions?: { all?: WorkflowConditionDefinition[]; any?: WorkflowConditionDefinition[] };
  condition_message?: string;
  scope?: { field: string; message?: string };
  mutation?: Record<string, unknown>;
};

export type WorkflowDefinition = {
  id: string;
  entity: string;
  handler: string;
  initial: string;
  permission: string;
  mutable?: boolean;
  status_source?: string;
  allow_add?: boolean;
  state_editor?: WorkflowStateEditorDefinition;
  states: WorkflowStateDefinition[];
  transitions: WorkflowTransitionDefinition[];
  mutations?: Record<string, { steps: unknown[]; database?: { guards?: unknown[]; steps: unknown[] } }>;
};

export type WorkflowStateEditorDefinition = {
  allow_edit?: boolean;
  allow_delete?: boolean;
  labels?: { edit_status?: string; add_status?: string };
  modals?: {
    add?: WorkflowStateEditorModalDefinition;
    edit?: WorkflowStateEditorModalDefinition;
    delete?: WorkflowStateEditorModalDefinition;
  };
};

export type WorkflowStateEditorModalDefinition = {
  title?: string;
  message?: string;
  input?: { label?: string; placeholder?: string };
  from_label?: string;
  to_label?: string;
  replacement_label?: string;
  confirm_label?: string;
  cancel_label?: string;
  danger_label?: string;
};

export class WorkflowSchemaError extends Error {
  issues: string[];

  constructor(issues: string[]) {
    super(`Invalid workflow definition:\n${issues.map(issue => `- ${issue}`).join('\n')}`);
    this.name = 'WorkflowSchemaError';
    this.issues = issues;
  }
}

const isRecord = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const ROOT_KEYS = new Set(['workflow']);
const WORKFLOW_KEYS = new Set(['id', 'entity', 'handler', 'initial', 'permission', 'mutable', 'status_source', 'allow_add', 'state_editor', 'states', 'transitions', 'mutations']);
const STATE_EDITOR_KEYS = new Set(['allow_edit', 'allow_delete', 'labels', 'modals']);
const STATE_EDITOR_LABEL_KEYS = new Set(['edit_status', 'add_status']);
const STATE_EDITOR_MODAL_KEYS = new Set(['title', 'message', 'input', 'from_label', 'to_label', 'replacement_label', 'confirm_label', 'cancel_label', 'danger_label']);
const STATE_EDITOR_INPUT_KEYS = new Set(['label', 'placeholder']);
const STATE_KEYS = new Set(['id', 'label', 'color', 'terminal']);
const TRANSITION_KEYS = new Set(['id', 'from', 'to', 'permission', 'conditions', 'condition_message', 'scope', 'mutation']);
const CONDITION_GROUP_KEYS = new Set(['all', 'any']);
const CONDITION_KEYS = new Set(['field', 'operator', 'value']);
const OPERATORS = new Set(['present', 'equals', 'not_equals', 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'in']);

function unknownKeys(value: Record<string, unknown>, allowed: Set<string>, path: string, issues: string[]) {
  for (const key of Object.keys(value)) if (!allowed.has(key)) issues.push(`${path} has unknown property "${key}"`);
}

function requiredString(value: unknown, path: string, issues: string[]) {
  if (!isString(value)) issues.push(`${path} must be a non-empty string`);
}

function validateConditions(value: unknown, path: string, issues: string[]) {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return;
  }
  unknownKeys(value, CONDITION_GROUP_KEYS, path, issues);
  if (value.all === undefined && value.any === undefined) issues.push(`${path} must define all or any`);
  for (const group of ['all', 'any'] as const) {
    if (value[group] === undefined) continue;
    if (!Array.isArray(value[group]) || !value[group].length) {
      issues.push(`${path}.${group} must be a non-empty array`);
      continue;
    }
    value[group].forEach((condition: unknown, index: number) => {
      const conditionPath = `${path}.${group}[${index}]`;
      if (!isRecord(condition)) {
        issues.push(`${conditionPath} must be an object`);
        return;
      }
      unknownKeys(condition, CONDITION_KEYS, conditionPath, issues);
      requiredString(condition.field, `${conditionPath}.field`, issues);
      if (!isString(condition.operator) || !OPERATORS.has(condition.operator)) issues.push(`${conditionPath}.operator is not supported`);
      if (condition.operator !== 'present' && condition.value === undefined) issues.push(`${conditionPath}.value is required`);
      if (condition.operator === 'in' && !Array.isArray(condition.value)) issues.push(`${conditionPath}.value must be an array for operator "in"`);
    });
  }
}

export function validateWorkflowDefinition(input: unknown): WorkflowDefinition {
  const issues: string[] = [];
  if (!isRecord(input)) throw new WorkflowSchemaError(['workflow file must be an object']);
  unknownKeys(input, ROOT_KEYS, 'workflow file', issues);
  if (!isRecord(input.workflow)) throw new WorkflowSchemaError([...issues, 'workflow must be an object']);
  const workflow = input.workflow;
  unknownKeys(workflow, WORKFLOW_KEYS, 'workflow', issues);
  for (const key of ['id', 'entity', 'handler', 'initial', 'permission'] as const) requiredString(workflow[key], `workflow.${key}`, issues);
  if (workflow.mutable !== undefined && typeof workflow.mutable !== 'boolean') issues.push('workflow.mutable must be a boolean');
  if (workflow.allow_add !== undefined && typeof workflow.allow_add !== 'boolean') issues.push('workflow.allow_add must be a boolean');
  if (workflow.status_source !== undefined) requiredString(workflow.status_source, 'workflow.status_source', issues);
  if (workflow.state_editor !== undefined) {
    if (!isRecord(workflow.state_editor)) issues.push('workflow.state_editor must be an object');
    else {
      unknownKeys(workflow.state_editor, STATE_EDITOR_KEYS, 'workflow.state_editor', issues);
      for (const key of ['allow_edit', 'allow_delete'] as const) {
        if (workflow.state_editor[key] !== undefined && typeof workflow.state_editor[key] !== 'boolean') issues.push(`workflow.state_editor.${key} must be a boolean`);
      }
      for (const key of [...STATE_EDITOR_KEYS].filter(key => !['allow_edit', 'allow_delete'].includes(key))) {
        if (key === 'labels' && workflow.state_editor.labels !== undefined) {
          if (!isRecord(workflow.state_editor.labels)) issues.push('workflow.state_editor.labels must be an object');
          else {
            unknownKeys(workflow.state_editor.labels, STATE_EDITOR_LABEL_KEYS, 'workflow.state_editor.labels', issues);
            for (const label of Object.keys(workflow.state_editor.labels)) requiredString(workflow.state_editor.labels[label], `workflow.state_editor.labels.${label}`, issues);
          }
        }
        if (key === 'modals' && workflow.state_editor.modals !== undefined) {
          if (!isRecord(workflow.state_editor.modals)) issues.push('workflow.state_editor.modals must be an object');
          else for (const [modalId, modal] of Object.entries(workflow.state_editor.modals)) {
            const modalPath = `workflow.state_editor.modals.${modalId}`;
            if (!isRecord(modal)) { issues.push(`${modalPath} must be an object`); continue; }
            unknownKeys(modal, STATE_EDITOR_MODAL_KEYS, modalPath, issues);
            for (const key of [...STATE_EDITOR_MODAL_KEYS].filter(candidate => candidate !== 'input')) {
              if (modal[key] !== undefined) requiredString(modal[key], `${modalPath}.${key}`, issues);
            }
            if (modal.input !== undefined) {
              if (!isRecord(modal.input)) issues.push(`${modalPath}.input must be an object`);
              else {
                unknownKeys(modal.input, STATE_EDITOR_INPUT_KEYS, `${modalPath}.input`, issues);
                for (const key of Object.keys(modal.input)) requiredString(modal.input[key], `${modalPath}.input.${key}`, issues);
              }
            }
          }
        }
      }
    }
  }

  const stateIds = new Set<string>();
  if (!Array.isArray(workflow.states) || !workflow.states.length) issues.push('workflow.states must be a non-empty array');
  else workflow.states.forEach((state: unknown, index: number) => {
    const path = `workflow.states[${index}]`;
    if (!isRecord(state)) {
      issues.push(`${path} must be an object`);
      return;
    }
    unknownKeys(state, STATE_KEYS, path, issues);
    requiredString(state.id, `${path}.id`, issues);
    requiredString(state.label, `${path}.label`, issues);
    if (state.color !== undefined) requiredString(state.color, `${path}.color`, issues);
    if (state.terminal !== undefined && typeof state.terminal !== 'boolean') issues.push(`${path}.terminal must be a boolean`);
    if (isString(state.id)) {
      if (stateIds.has(state.id)) issues.push(`${path}.id duplicates state "${state.id}"`);
      stateIds.add(state.id);
    }
  });
  if (isString(workflow.initial) && !stateIds.has(workflow.initial)) issues.push(`workflow.initial references unknown state "${workflow.initial}"`);

  const transitionIds = new Set<string>();
  if (!Array.isArray(workflow.transitions) || !workflow.transitions.length) issues.push('workflow.transitions must be a non-empty array');
  else workflow.transitions.forEach((transition: unknown, index: number) => {
    const path = `workflow.transitions[${index}]`;
    if (!isRecord(transition)) {
      issues.push(`${path} must be an object`);
      return;
    }
    unknownKeys(transition, TRANSITION_KEYS, path, issues);
    requiredString(transition.id, `${path}.id`, issues);
    requiredString(transition.to, `${path}.to`, issues);
    requiredString(transition.permission, `${path}.permission`, issues);
    const from = Array.isArray(transition.from) ? transition.from : [transition.from];
    if (!from.length || from.some(value => !isString(value))) issues.push(`${path}.from must be a state or non-empty array of states`);
    if (isString(transition.id)) {
      if (transitionIds.has(transition.id)) issues.push(`${path}.id duplicates transition "${transition.id}"`);
      transitionIds.add(transition.id);
    }
    for (const state of from) if (isString(state) && !stateIds.has(state)) issues.push(`${path}.from references unknown state "${state}"`);
    if (isString(transition.to) && !stateIds.has(transition.to)) issues.push(`${path}.to references unknown state "${transition.to}"`);
    if (transition.conditions !== undefined) validateConditions(transition.conditions, `${path}.conditions`, issues);
    if (transition.condition_message !== undefined) requiredString(transition.condition_message, `${path}.condition_message`, issues);
  });

  if (issues.length) throw new WorkflowSchemaError(issues);
  return workflow as WorkflowDefinition;
}
