export type PageAuthDefinition = {
  require?: string[];
};

export type PageDefinition = {
  id: string;
  auth?: PageAuthDefinition;
};

export type DatasourceDefinition = {
  id: string;
  permission: string;
  query: string;
  single?: boolean;
};

export type ToolbarDefinition = {
  id: string;
  label: string;
  action: string;
  permission?: string;
  variant?: string;
};

export type ComponentDefinition = {
  type: string;
  source?: string;
  [key: string]: unknown;
};

export type ActionDefinition = {
  id: string;
  type: 'form' | 'server_form' | 'delete' | 'patch' | 'navigate' | 'server' | 'upload' | 'download';
  [key: string]: unknown;
};

export type PageConfig = {
  title?: string;
  page: PageDefinition;
  datasources?: DatasourceDefinition[];
  toolbar?: ToolbarDefinition[];
  filters?: Record<string, unknown>;
  components?: ComponentDefinition[];
  actions?: ActionDefinition[];
};

export type PageValidationOptions = {
  /**
   * Public page responses intentionally omit server-owned datasource SQL.
   * The renderer still validates structure, but cannot resolve source IDs.
   */
  allowExternalSources?: boolean;
};

const ROOT_KEYS = new Set([
  'title',
  'page',
  'datasources',
  'toolbar',
  'filters',
  'components',
  'actions',
]);
const PAGE_KEYS = new Set(['id', 'auth']);
const AUTH_KEYS = new Set(['require']);
const DATASOURCE_KEYS = new Set(['id', 'single', 'permission', 'query']);
const TOOLBAR_KEYS = new Set(['id', 'label', 'variant', 'permission', 'action']);
const FILTER_KEYS = new Set(['source', 'fields']);
const FILTER_FIELD_KEYS = new Set(['field', 'label', 'type', 'options', 'placeholder']);
const FIELD_KEYS = new Set(['field', 'label', 'type', 'required', 'options', 'default']);
const COLUMN_KEYS = new Set([
  'field',
  'label',
  'type',
  'secondary',
  'sortable',
  'align',
  'actions',
  'colors',
  'format',
  'overdueField',
]);
const ROW_ACTION_KEYS = new Set(['id', 'label', 'variant', 'show_if']);
const TAB_KEYS = new Set(['id', 'label', 'components', 'permission', 'count']);
const STAT_KEYS = new Set(['label', 'field', 'format', 'currency', 'color']);
const SEARCH_KEYS = new Set(['label', 'placeholder', 'action']);
const DATE_RANGE_KEYS = new Set(['from_field', 'to_field', 'from_label', 'to_label', 'presets', 'preset_style']);
const TOOLBAR_FILTER_KEYS = new Set(['field', 'label', 'options', 'placeholder']);
const COMPONENT_ACTION_KEYS = new Set([
  'id',
  'label',
  'icon',
  'title',
  'action',
  'params',
  'variant',
  'disabled',
  'permission',
  'show_if',
]);
const EMPTY_STATE_KEYS = new Set(['title', 'description']);

const ACTION_KEYS: Record<ActionDefinition['type'], Set<string>> = {
  form: new Set(['id', 'type', 'title', 'table', 'operation', 'prefill', 'prefill_source', 'refresh', 'fields', 'scope']),
  server_form: new Set(['id', 'type', 'title', 'action', 'prefill', 'prefill_source', 'refresh', 'fields', 'params']),
  delete: new Set(['id', 'type', 'confirm', 'table', 'refresh', 'scope']),
  patch: new Set(['id', 'type', 'confirm', 'table', 'body', 'refresh', 'scope']),
  navigate: new Set(['id', 'type', 'navigate_to', 'params']),
  server: new Set(['id', 'type', 'action', 'confirm', 'refresh', 'params']),
  upload: new Set(['id', 'type', 'kind', 'refresh', 'params', 'scope']),
  download: new Set(['id', 'type', 'kind']),
};

const COMPONENT_KEYS = new Map<string, Set<string>>([
  ['ComingSoon', new Set(['type', 'id', 'eyebrow', 'title', 'description', 'icon'])],
  ['DataGrid', new Set(['type', 'source', 'page_size', 'row_key', 'empty_state', 'columns', 'selectable', 'column_chooser'])],
  ['GridView', new Set(['type', 'source', 'page_size', 'columns'])],
  ['ListToolbar', new Set(['type', 'source', 'filter_field', 'search', 'actions', 'date_range', 'filters', 'filter_sources'])],
  ['StatusTabs', new Set(['type', 'source', 'filter_field', 'tabs'])],
  ['TabGroup', new Set(['type', 'tabs'])],
  ['StatRow', new Set(['type', 'source', 'title', 'stats'])],
  ['Chart', new Set(['type', 'source', 'title', 'label_field', 'value_field', 'width', 'height', 'color'])],
  ['DocumentSummary', new Set(['type', 'source', 'title_field', 'subtitle_field', 'status_field', 'status_colors', 'columns'])],
  ['LineItemGrid', new Set(['type', 'source', 'title', 'description', 'page_size', 'row_key', 'empty_state', 'columns', 'actions'])],
  ['ContactGrid', new Set(['type', 'source', 'title', 'description', 'page_size', 'row_key', 'empty_state', 'columns', 'actions'])],
  ['MoneySummary', new Set(['type', 'source', 'title', 'stats'])],
  ['ApprovalTimeline', new Set(['type', 'source', 'title', 'actor_field', 'action_field', 'detail_field', 'timestamp_field'])],
  ['ChatWorkspace', new Set([
    'type',
    'id',
    'source',
    'message_source',
    'attachment_source',
    'page_size',
    'message_page_size',
    'send_action',
    'upload_action',
    'download_action',
    'mark_read_action',
    'search_placeholder',
    'empty_threads',
    'empty_messages',
  ])],
]);

export class PageSchemaError extends Error {
  issues: string[];

  constructor(issues: string[]) {
    super(`Invalid page definition:\n${issues.map((issue) => `- ${issue}`).join('\n')}`);
    this.name = 'PageSchemaError';
    this.issues = issues;
  }
}

/**
 * Custom components must declare their YAML surface before page definitions
 * can use them. The common `type`, `id`, and `source` keys are added here.
 */
export function registerPageComponentSchema(type: string, keys: string[]) {
  if (!type.trim()) throw new Error('Component schema type is required');
  COMPONENT_KEYS.set(type, new Set(['type', 'id', 'source', ...keys]));
}

export function validatePageDefinition(
  input: unknown,
  options: PageValidationOptions = {},
): PageConfig {
  const issues: string[] = [];
  if (!isRecord(input)) throw new PageSchemaError(['page config must be an object']);

  rejectUnknownKeys(input, ROOT_KEYS, 'page config', issues);
  requireRecord(input.page, 'page', issues);
  if (isRecord(input.page)) {
    rejectUnknownKeys(input.page, PAGE_KEYS, 'page', issues);
    requireString(input.page.id, 'page.id', issues);
    if (input.page.auth !== undefined) {
      requireRecord(input.page.auth, 'page.auth', issues);
      if (isRecord(input.page.auth)) {
        rejectUnknownKeys(input.page.auth, AUTH_KEYS, 'page.auth', issues);
        requireStringArray(input.page.auth.require, 'page.auth.require', issues, true);
      }
    }
  }

  const datasourceIds = new Set<string>();
  const actionIds = new Set<string>();
  validateDatasources(input.datasources, datasourceIds, issues);
  validateActions(input.actions, actionIds, datasourceIds, options, issues);
  validateToolbar(input.toolbar, actionIds, issues);
  validateFilters(input.filters, datasourceIds, options, issues);
  validateComponents(input.components, 'components', datasourceIds, actionIds, options, issues);

  if (issues.length) throw new PageSchemaError(issues);
  return input as PageConfig;
}

function validateDatasources(value: unknown, ids: Set<string>, issues: string[]) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push('datasources must be an array');
    return;
  }
  value.forEach((source, index) => {
    const path = `datasources[${index}]`;
    requireRecord(source, path, issues);
    if (!isRecord(source)) return;
    rejectUnknownKeys(source, DATASOURCE_KEYS, path, issues);
    requireString(source.id, `${path}.id`, issues);
    requireString(source.permission, `${path}.permission`, issues);
    requireString(source.query, `${path}.query`, issues);
    if (source.single !== undefined && typeof source.single !== 'boolean') {
      issues.push(`${path}.single must be a boolean`);
    }
    if (typeof source.id === 'string') addUnique(ids, source.id, `${path}.id`, 'datasource', issues);
  });
}

function validateActions(
  value: unknown,
  ids: Set<string>,
  datasourceIds: Set<string>,
  options: PageValidationOptions,
  issues: string[],
) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push('actions must be an array');
    return;
  }
  value.forEach((action, index) => {
    const path = `actions[${index}]`;
    requireRecord(action, path, issues);
    if (!isRecord(action)) return;
    requireString(action.id, `${path}.id`, issues);
    requireString(action.type, `${path}.type`, issues);
    const type = action.type as ActionDefinition['type'];
    const allowedKeys = ACTION_KEYS[type];
    if (!allowedKeys) {
      issues.push(`${path}.type has unsupported value "${String(action.type)}"`);
      return;
    }
    rejectUnknownKeys(action, allowedKeys, path, issues);
    if (typeof action.id === 'string') addUnique(ids, action.id, `${path}.id`, 'action', issues);

    if (type === 'form') {
      requireString(action.title, `${path}.title`, issues);
      requireString(action.table, `${path}.table`, issues);
      if (action.operation !== 'insert' && action.operation !== 'update') {
        issues.push(`${path}.operation must be "insert" or "update"`);
      }
      validateFields(action.fields, `${path}.fields`, issues);
    } else if (type === 'server_form') {
      requireString(action.title, `${path}.title`, issues);
      requireString(action.action, `${path}.action`, issues);
      validateFields(action.fields, `${path}.fields`, issues);
      if (action.params !== undefined && !isRecord(action.params)) {
        issues.push(`${path}.params must be an object`);
      }
    } else if (type === 'delete' || type === 'patch') {
      requireString(action.table, `${path}.table`, issues);
      if (type === 'patch' && !isRecord(action.body)) issues.push(`${path}.body must be an object`);
    } else if (type === 'navigate') {
      requireString(action.navigate_to, `${path}.navigate_to`, issues);
    } else if (type === 'server') {
      requireString(action.action, `${path}.action`, issues);
      if (action.params !== undefined && !isRecord(action.params)) {
        issues.push(`${path}.params must be an object`);
      }
    }

    validateRefresh(action.refresh, `${path}.refresh`, datasourceIds, options, issues);
  });
}

function validateToolbar(value: unknown, actionIds: Set<string>, issues: string[]) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push('toolbar must be an array');
    return;
  }
  const ids = new Set<string>();
  value.forEach((item, index) => {
    const path = `toolbar[${index}]`;
    requireRecord(item, path, issues);
    if (!isRecord(item)) return;
    rejectUnknownKeys(item, TOOLBAR_KEYS, path, issues);
    requireString(item.id, `${path}.id`, issues);
    requireString(item.label, `${path}.label`, issues);
    requireString(item.action, `${path}.action`, issues);
    if (typeof item.id === 'string') addUnique(ids, item.id, `${path}.id`, 'toolbar item', issues);
    if (typeof item.action === 'string' && !actionIds.has(item.action)) {
      issues.push(`${path}.action references unknown action "${item.action}"`);
    }
  });
}

function validateFilters(
  value: unknown,
  datasourceIds: Set<string>,
  options: PageValidationOptions,
  issues: string[],
) {
  if (value === undefined) return;
  requireRecord(value, 'filters', issues);
  if (!isRecord(value)) return;
  rejectUnknownKeys(value, FILTER_KEYS, 'filters', issues);
  requireSource(value.source, 'filters.source', datasourceIds, options, issues);
  if (!Array.isArray(value.fields)) {
    issues.push('filters.fields must be an array');
    return;
  }
  value.fields.forEach((field, index) => {
    const path = `filters.fields[${index}]`;
    requireRecord(field, path, issues);
    if (!isRecord(field)) return;
    rejectUnknownKeys(field, FILTER_FIELD_KEYS, path, issues);
    requireString(field.field, `${path}.field`, issues);
    requireString(field.label, `${path}.label`, issues);
    requireString(field.type, `${path}.type`, issues);
  });
}

function validateComponents(
  value: unknown,
  rootPath: string,
  datasourceIds: Set<string>,
  actionIds: Set<string>,
  options: PageValidationOptions,
  issues: string[],
) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push(`${rootPath} must be an array`);
    return;
  }
  value.forEach((component, index) => {
    const path = `${rootPath}[${index}]`;
    requireRecord(component, path, issues);
    if (!isRecord(component)) return;
    requireString(component.type, `${path}.type`, issues);
    const allowedKeys = COMPONENT_KEYS.get(String(component.type));
    if (!allowedKeys) {
      issues.push(`${path}.type has no registered schema: "${String(component.type)}"`);
      return;
    }
    rejectUnknownKeys(component, allowedKeys, path, issues);
    if (component.source !== undefined) {
      requireSource(component.source, `${path}.source`, datasourceIds, options, issues);
    }
    if (component.type === 'ChatWorkspace') {
      requireSource(component.message_source, `${path}.message_source`, datasourceIds, options, issues);
      requireSource(component.attachment_source, `${path}.attachment_source`, datasourceIds, options, issues);
      for (const key of ['send_action', 'upload_action', 'download_action', 'mark_read_action']) {
        requireString(component[key], `${path}.${key}`, issues);
        if (typeof component[key] === 'string' && !actionIds.has(component[key])) {
          issues.push(`${path}.${key} references unknown action "${component[key]}"`);
        }
      }
    }

    validateColumns(component.columns, `${path}.columns`, actionIds, issues);
    validateTabs(component.tabs, `${path}.tabs`, datasourceIds, actionIds, options, issues);
    validateStats(component.stats, `${path}.stats`, issues);
    validateSearch(component.search, `${path}.search`, issues);
    validateDateRange(component.date_range, `${path}.date_range`, issues);
    validateToolbarFilters(component.filters, `${path}.filters`, issues);
    validateComponentActions(component.actions, `${path}.actions`, issues);
    if (component.empty_state !== undefined) {
      requireRecord(component.empty_state, `${path}.empty_state`, issues);
      if (isRecord(component.empty_state)) {
        rejectUnknownKeys(component.empty_state, EMPTY_STATE_KEYS, `${path}.empty_state`, issues);
      }
    }
  });
}

function validateFields(value: unknown, path: string, issues: string[]) {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(`${path} must be a non-empty array`);
    return;
  }
  value.forEach((field, index) => {
    const fieldPath = `${path}[${index}]`;
    requireRecord(field, fieldPath, issues);
    if (!isRecord(field)) return;
    rejectUnknownKeys(field, FIELD_KEYS, fieldPath, issues);
    requireString(field.field, `${fieldPath}.field`, issues);
    requireString(field.label, `${fieldPath}.label`, issues);
    requireString(field.type, `${fieldPath}.type`, issues);
  });
}

function validateColumns(value: unknown, path: string, actionIds: Set<string>, issues: string[]) {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(`${path} must be a non-empty array`);
    return;
  }
  value.forEach((column, index) => {
    const columnPath = `${path}[${index}]`;
    requireRecord(column, columnPath, issues);
    if (!isRecord(column)) return;
    rejectUnknownKeys(column, COLUMN_KEYS, columnPath, issues);
    if (column.type !== 'ActionCell') {
      requireString(column.field, `${columnPath}.field`, issues);
    }
    requireString(column.label, `${columnPath}.label`, issues, true);
    if (column.actions !== undefined) {
      if (!Array.isArray(column.actions)) {
        issues.push(`${columnPath}.actions must be an array`);
      } else {
        column.actions.forEach((action, actionIndex) => {
          const actionPath = `${columnPath}.actions[${actionIndex}]`;
          requireRecord(action, actionPath, issues);
          if (!isRecord(action)) return;
          rejectUnknownKeys(action, ROW_ACTION_KEYS, actionPath, issues);
          requireString(action.id, `${actionPath}.id`, issues);
          requireString(action.label, `${actionPath}.label`, issues);
          if (typeof action.id === 'string' && !actionIds.has(action.id)) {
            issues.push(`${actionPath}.id references unknown action "${action.id}"`);
          }
        });
      }
    }
  });
}

function validateTabs(
  value: unknown,
  path: string,
  datasourceIds: Set<string>,
  actionIds: Set<string>,
  options: PageValidationOptions,
  issues: string[],
) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return;
  }
  value.forEach((tab, index) => {
    const tabPath = `${path}[${index}]`;
    requireRecord(tab, tabPath, issues);
    if (!isRecord(tab)) return;
    rejectUnknownKeys(tab, TAB_KEYS, tabPath, issues);
    requireString(tab.id, `${tabPath}.id`, issues, true);
    requireString(tab.label, `${tabPath}.label`, issues);
    if (tab.components !== undefined) {
      validateComponents(tab.components, `${tabPath}.components`, datasourceIds, actionIds, options, issues);
    }
  });
}

function validateStats(value: unknown, path: string, issues: string[]) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return;
  }
  value.forEach((stat, index) => {
    const statPath = `${path}[${index}]`;
    requireRecord(stat, statPath, issues);
    if (!isRecord(stat)) return;
    rejectUnknownKeys(stat, STAT_KEYS, statPath, issues);
    requireString(stat.label, `${statPath}.label`, issues);
    requireString(stat.field, `${statPath}.field`, issues);
  });
}

function validateSearch(value: unknown, path: string, issues: string[]) {
  if (value === undefined || value === false) return;
  requireRecord(value, path, issues);
  if (isRecord(value)) rejectUnknownKeys(value, SEARCH_KEYS, path, issues);
}

function validateDateRange(value: unknown, path: string, issues: string[]) {
  if (value === undefined) return;
  requireRecord(value, path, issues);
  if (!isRecord(value)) return;
  rejectUnknownKeys(value, DATE_RANGE_KEYS, path, issues);
  for (const key of ['from_field', 'to_field', 'from_label', 'to_label']) {
    if (value[key] !== undefined) requireString(value[key], `${path}.${key}`, issues);
  }
  if (value.presets !== undefined) {
    if (!Array.isArray(value.presets)) {
      issues.push(`${path}.presets must be an array`);
    } else {
      const allowed = new Set(['today', 'previous_month', 'week', 'month', 'quarter', 'year', 'last_12_months', 'all']);
      value.presets.forEach((preset, index) => {
        if (typeof preset !== 'string' || !allowed.has(preset)) {
          issues.push(`${path}.presets[${index}] must be one of today, previous_month, week, month, quarter, year, last_12_months, all`);
        }
      });
    }
  }
  if (value.preset_style !== undefined && value.preset_style !== 'select' && value.preset_style !== 'segmented') {
    issues.push(`${path}.preset_style must be select or segmented`);
  }
}

function validateToolbarFilters(value: unknown, path: string, issues: string[]) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return;
  }
  value.forEach((filter, index) => {
    const filterPath = `${path}[${index}]`;
    requireRecord(filter, filterPath, issues);
    if (!isRecord(filter)) return;
    rejectUnknownKeys(filter, TOOLBAR_FILTER_KEYS, filterPath, issues);
    requireString(filter.field, `${filterPath}.field`, issues);
    requireString(filter.label, `${filterPath}.label`, issues);
    if (!Array.isArray(filter.options)) {
      issues.push(`${filterPath}.options must be an array`);
    } else {
      filter.options.forEach((option: unknown, optionIndex: number) => {
        if (typeof option === 'string') return;
        const optionPath = `${filterPath}.options[${optionIndex}]`;
        requireRecord(option, optionPath, issues);
        if (isRecord(option)) {
          rejectUnknownKeys(option, new Set(['id', 'label']), optionPath, issues);
          requireString(option.id, `${optionPath}.id`, issues);
          requireString(option.label, `${optionPath}.label`, issues);
        }
      });
    }
    if (filter.placeholder !== undefined) requireString(filter.placeholder, `${filterPath}.placeholder`, issues);
  });
}

function validateComponentActions(value: unknown, path: string, issues: string[]) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return;
  }
  value.forEach((action, index) => {
    const actionPath = `${path}[${index}]`;
    requireRecord(action, actionPath, issues);
    if (!isRecord(action)) return;
    rejectUnknownKeys(action, COMPONENT_ACTION_KEYS, actionPath, issues);
    requireString(action.id, `${actionPath}.id`, issues);
  });
}

function validateRefresh(
  value: unknown,
  path: string,
  datasourceIds: Set<string>,
  options: PageValidationOptions,
  issues: string[],
) {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string')) {
    issues.push(`${path} must be an array of strings`);
    return;
  }
  for (const id of value) {
    if (!options.allowExternalSources && !datasourceIds.has(id)) {
      issues.push(`${path} references unknown datasource "${id}"`);
    }
  }
}

function requireSource(
  value: unknown,
  path: string,
  datasourceIds: Set<string>,
  options: PageValidationOptions,
  issues: string[],
) {
  requireString(value, path, issues);
  if (
    typeof value === 'string'
    && !options.allowExternalSources
    && !datasourceIds.has(value)
  ) {
    issues.push(`${path} references unknown datasource "${value}"`);
  }
}

function addUnique(
  ids: Set<string>,
  id: string,
  path: string,
  kind: string,
  issues: string[],
) {
  if (ids.has(id)) issues.push(`${path} duplicates ${kind} "${id}"`);
  ids.add(id);
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
  issues: string[],
) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) issues.push(`${path}.${key} is not allowed`);
  }
}

function requireRecord(value: unknown, path: string, issues: string[]) {
  if (!isRecord(value)) issues.push(`${path} must be an object`);
}

function requireString(
  value: unknown,
  path: string,
  issues: string[],
  allowEmpty = false,
) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) {
    issues.push(`${path} must be ${allowEmpty ? 'a string' : 'a non-empty string'}`);
  }
}

function requireStringArray(
  value: unknown,
  path: string,
  issues: string[],
  optional = false,
) {
  if (value === undefined && optional) return;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    issues.push(`${path} must be an array of non-empty strings`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
