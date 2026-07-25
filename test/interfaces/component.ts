// @core3/frontend — component contracts
// Implementation lives in packages/frontend; this file is the design contract.

export interface ComponentDef {
  type: string;
  id: string;
  field?: string;
  label?: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  secondary?: string;         // field name for secondary text
  colorField?: string;        // field name for badge color
  iconField?: string;         // field name for badge icon
  format?: string;            // e.g. 'relative' | 'short' | 'long' | 'percent'
  currency?: string;          // e.g. 'USD' | 'EUR'
  editable?: boolean;
  readonly?: boolean;
  required?: boolean;
  placeholder?: string;
  options?: string[];         // static options for SelectInput
  source?: string;            // datasource id for dynamic options
  actions?: RowAction[];      // for ActionCell
  components?: ComponentDef[]; // nested child components
  class?: string;             // Tailwind class overrides
  [key: string]: unknown;     // type-specific extra props
}

export interface RowAction {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  permission?: string;
  confirm?: boolean;
}

export interface ComponentState {
  [key: string]: unknown;
}

export interface RenderContext {
  user: import('./auth').User;
  page: import('./runtime').PageConfig;
  bus: import('./runtime').EventBus;
}

/**
 * Base class for all framework components.
 * Every component is a node in a virtual tree with pure JSON state.
 */
export abstract class BaseComponent<S extends ComponentState = ComponentState> {
  readonly id: string;
  state: S;
  readonly parent: BaseComponent | null;
  readonly children: BaseComponent[];

  /** Always returns the top-level page component (root of the tree). */
  get root(): BaseComponent { throw new Error('abstract'); }

  /** Build the full DOM subtree. Called once on initial mount. */
  abstract draw(container: HTMLElement): void;

  /**
   * Patch what changed. Override for performance.
   * Default: clear container + call draw().
   */
  redraw(): void { throw new Error('abstract'); }

  /**
   * Merge partial state. Triggers redraw by default.
   * Pass redraw=false to batch multiple updates.
   */
  setState(partial: Partial<S>, redraw?: boolean): void { throw new Error('abstract'); }

  /**
   * Create a child component, register it in the tree, and return it.
   * Child's .parent is set automatically.
   */
  createChild<C extends BaseComponent>(
    ctor: new (...args: unknown[]) => C,
    state: unknown,
  ): C { throw new Error('abstract'); }

  /** Find any component by id anywhere in the subtree (depth-first). */
  find(id: string): BaseComponent | null { throw new Error('abstract'); }

  /**
   * Submit a named action to the backend.
   * The name maps to an `actions:` entry in the YAML page definition.
   */
  submit(action: string, params?: Record<string, unknown>): Promise<unknown> {
    throw new Error('abstract');
  }
}

// ─── Concrete component state shapes ────────────────────────────────────────

export interface TextCellState extends ComponentState {
  value: string | null;
  secondary?: string | null;
}

export interface BadgeCellState extends ComponentState {
  value: string | null;
  color?: string | null;
  icon?: string | null;
}

export interface CurrencyCellState extends ComponentState {
  value: number | null;
  currency?: string;
}

export interface NumberCellState extends ComponentState {
  value: number | null;
  editing?: boolean;
}

export interface DateCellState extends ComponentState {
  value: string | null;   // ISO date string
  format?: 'relative' | 'short' | 'long';
  overdue?: boolean;
}

export interface BooleanCellState extends ComponentState {
  value: boolean | null;
}

export interface ActionCellState extends ComponentState {
  actions: RowAction[];
  row: Record<string, unknown>;
  loading?: boolean;
}

export interface GridViewState extends ComponentState {
  rows: Record<string, unknown>[];
  meta: { total: number; page: number; pageSize: number };
  selectedIds?: string[];
  loading?: boolean;
}

export interface FormPanelState extends ComponentState {
  values: Record<string, unknown>;
  errors: Record<string, string>;
  dirty: boolean;
  saving: boolean;
}

export interface StatCardState extends ComponentState {
  label: string;
  value: number | string | null;
  format?: 'number' | 'currency' | 'percent';
  trend?: 'up' | 'down' | 'flat';
  delta?: string;
  color?: 'gray' | 'green' | 'red' | 'amber' | 'blue' | 'teal';
}

export interface ProgressBarState extends ComponentState {
  label: string;
  value: number;
  max: number;
  color?: 'green' | 'teal' | 'amber' | 'red' | 'blue';
}

export interface TabPanelState extends ComponentState {
  active: string;
}

export interface FilterBarState extends ComponentState {
  values: Record<string, string>;
}
