import { validateWorkflowDefinition, WorkflowSchemaError, type WorkflowDefinition } from './workflow-schema.ts';

export type PageAuthDefinition = {
  require?: string[];
};

const isString = (value: unknown): value is string => typeof value === 'string';

export type PageDefinition = {
  id: string;
  auth?: PageAuthDefinition;
  breadcrumb?: string[];
};

export type DatasourceDefinition = {
  id: string;
  permission: string;
  type?: 'local' | 'service';
  query?: string;
  service?: string;
  operation?: string;
  service_params?: Record<string, unknown>;
  enrich?: Record<string, unknown>;
  single?: boolean;
  data?: unknown;
  workflow?: string | WorkflowDefinition;
  workflow_states?: string;
  meta?: Record<string, unknown>;
};

export type ToolbarDefinition = {
  id: string;
  label: string;
  icon?: string;
  action: string;
  permission?: string;
  variant?: string;
  show_if?: string;
};

export type ComponentDefinition = {
  type: string;
  source?: string;
  [key: string]: unknown;
};

export type ActionDefinition = {
  id: string;
  type: 'form' | 'server_form' | 'delete' | 'patch' | 'navigate' | 'server' | 'upload' | 'download' | 'login' | 'event' | 'request' | 'client' | 'logout';
  permission?: string;
  handler?: string;
  operation?: string;
  domain?: string;
  kind?: string;
  [key: string]: unknown;
};

export type PageConfig = {
  title?: string;
  locale?: string;
  scope?: { label: string; value: string };
  page: PageDefinition;
  datasources?: DatasourceDefinition[];
  toolbar?: ToolbarDefinition[];
  filters?: Record<string, unknown>;
  components?: ComponentDefinition[];
  actions?: ActionDefinition[];
  api?: { endpoint: string; fields?: string[] };
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
  'locale',
  'scope',
  'page',
  'datasources',
  'toolbar',
  'filters',
  'components',
  'actions',
  'api',
]);
const PAGE_KEYS = new Set(['id', 'auth', 'breadcrumb']);
const AUTH_KEYS = new Set(['require']);
const SCOPE_KEYS = new Set(['label', 'value']);
const DATASOURCE_KEYS = new Set(['id', 'type', 'single', 'permission', 'query', 'data', 'meta', 'workflow', 'workflow_states', 'pivot', 'query_window', 'service', 'operation', 'service_params', 'enrich', 'limit_param']);
const TOOLBAR_KEYS = new Set(['id', 'label', 'icon', 'variant', 'permission', 'action', 'show_if']);
const FILTER_KEYS = new Set(['source', 'fields', 'all_label', 'clear_label']);
const FILTER_FIELD_KEYS = new Set(['field', 'label', 'type', 'options', 'options_source', 'placeholder']);
const FIELD_KEYS = new Set(['field', 'label', 'type', 'required', 'options', 'options_source', 'multiple', 'default', 'tokens', 'show_if', 'placeholder', 'search_placeholder', 'currency', 'decimals', 'min', 'max', 'step']);
const COLUMN_KEYS = new Set([
  'field',
  'label',
  'type',
  'secondary',
  'avatar',
  'sortable',
  'align',
  'actions',
  'colors',
  'format',
  'overdueField',
  'optional',
]);
const ROW_ACTION_KEYS = new Set(['id', 'label', 'icon', 'variant', 'permission', 'show_if']);
const TAB_KEYS = new Set(['id', 'label', 'components', 'permission', 'count']);
const STAT_KEYS = new Set(['label', 'field', 'format', 'currency', 'color', 'navigate_to']);
const SEARCH_KEYS = new Set(['label', 'placeholder', 'action']);
const DATE_RANGE_KEYS = new Set(['from_field', 'to_field', 'from_label', 'to_label', 'label', 'presets', 'preset_labels', 'preset_style', 'default_preset', 'max_years', 'deny_unbounded']);
const TOOLBAR_FILTER_KEYS = new Set(['field', 'label', 'options', 'options_source', 'placeholder']);
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
const LIST_VIEW_LABEL_KEYS = new Set(['new', 'filters', 'columns', 'selected', 'clear_selection', 'remove_filter', 'previous_page', 'next_page', 'select_all', 'select_row', 'search_facet', 'apply', 'more_actions']);
const CHART_COLORS = new Set(['blue', 'indigo', 'green', 'amber', 'red', 'teal']);

const ACTION_KEYS: Record<ActionDefinition['type'], Set<string>> = {
  form: new Set(['id', 'type', 'title', 'table', 'operation', 'prefill', 'prefill_source', 'refresh', 'fields', 'scope', 'permission', 'action', 'handler', 'mutation', 'success_message']),
  server_form: new Set(['id', 'type', 'title', 'action', 'prefill', 'prefill_source', 'refresh', 'fields', 'params', 'permission', 'handler', 'operation', 'domain', 'kind', 'topic', 'topic_version', 'event', 'mutation', 'success_message']),
  delete: new Set(['id', 'type', 'confirm', 'table', 'refresh', 'scope', 'permission', 'action', 'handler', 'mutation']),
  patch: new Set(['id', 'type', 'confirm', 'table', 'body', 'refresh', 'scope', 'permission']),
  navigate: new Set(['id', 'type', 'navigate_to', 'params', 'permission']),
  server: new Set(['id', 'type', 'action', 'confirm', 'refresh', 'params', 'permission', 'result', 'result_field', 'handler', 'workflow', 'operation', 'domain', 'kind', 'topic', 'topic_version', 'event', 'mutation']),
  upload: new Set(['id', 'type', 'kind', 'refresh', 'params', 'scope', 'permission', 'action', 'handler', 'topic', 'topic_version', 'event', 'mutation']),
  download: new Set(['id', 'type', 'kind', 'permission']),
  login: new Set(['id', 'type', 'endpoint', 'redirect_param', 'permission']),
  request: new Set(['id', 'type', 'method', 'endpoint', 'body', 'permission']),
  client: new Set(['id', 'type', 'script', 'permission']),
  logout: new Set(['id', 'type', 'permission']),
  event: new Set(['id', 'type', 'event', 'params', 'title', 'message', 'close_label', 'icon', 'permission']),
};
const PERMISSION_REQUIRED_ACTION_TYPES = new Set<ActionDefinition['type']>([
  'form',
  'server_form',
  'delete',
  'patch',
  'server',
  'upload',
  'download',
]);

const COMPONENT_KEYS = new Map<string, Set<string>>([
  ['PageIntro', new Set(['type', 'greeting', 'title', 'description', 'action_label', 'greeting_side', 'compact'])],
  ['ComingSoon', new Set(['type', 'id', 'eyebrow', 'title', 'description', 'icon'])],
  ['DataGrid', new Set(['type', 'source', 'page_size', 'page_size_options', 'row_key', 'row_numbers', 'empty_state', 'columns', 'selectable', 'column_chooser', 'reorder', 'tree'])],
  ['ListView', new Set(['type', 'source', 'variant', 'scroll', 'create_action', 'create_label', 'search', 'date_range', 'filter_sources', 'filters', 'actions', 'group_by', 'favorites', 'bulk_actions', 'labels', 'views', 'view_navigation', 'form_view', 'page_size', 'row_key', 'tree', 'parent_field', 'empty_state', 'columns', 'selectable', 'column_chooser', 'row_open_action', 'row_double_click_action', 'row_actions'])],
  ['ScheduleGrid', new Set(['type', 'source', 'title', 'date_field', 'resource_field', 'resource_label_field', 'title_field', 'subtitle_field', 'status_field', 'empty_state'])],
  ['GridView', new Set(['type', 'source', 'page_size', 'empty_state', 'labels', 'columns'])],
  ['ListToolbar', new Set(['type', 'source', 'filter_field', 'search', 'search_button', 'actions', 'date_range', 'filters', 'filter_sources', 'advanced_filter', 'help', 'actions_inline'])],
  ['StatusTabs', new Set(['type', 'source', 'filter_field', 'tabs', 'show_counts', 'variant'])],
  ['TabGroup', new Set(['type', 'tabs'])],
  ['StatRow', new Set(['type', 'source', 'title', 'stats'])],
  ['Chart', new Set(['type', 'source', 'title', 'label_field', 'value_field', 'width', 'height', 'color', 'variant', 'series', 'layout'])],
  ['DocumentSummary', new Set(['type', 'source', 'title_field', 'subtitle_field', 'status_field', 'status_colors', 'columns'])],
  ['OdooFormView', new Set(['type', 'source', 'title_field', 'subtitle_field', 'status_field', 'status_label_field', 'status_colors', 'statusbar', 'statusbar_source', 'status_badges', 'form_mode', 'editable', 'fields', 'relations', 'groups', 'group_columns', 'notebook', 'header_actions', 'message_source', 'message_page_size', 'follower_source', 'follower_candidates_source', 'follower_candidates_page_size', 'attachment_source', 'attachment_page_size', 'chatter_label', 'chatter_empty', 'message_label', 'note_label', 'activity_label', 'message_action', 'note_action', 'activity_action', 'message_placeholder', 'note_placeholder', 'activity_placeholder', 'send_label', 'log_label', 'schedule_label', 'cancel_label', 'follower_label', 'attachment_label', 'add_follower_label', 'remove_follower_label', 'no_followers_label', 'follower_search_placeholder', 'add_label', 'add_attachment_label', 'no_attachments_label', 'uploading_label', 'upload_failed_label', 'download_label', 'preview_label', 'attachment_accept', 'follower_add_action', 'follower_remove_action', 'attachment_upload_action', 'attachment_download_action', 'message_actor_field', 'message_action_field', 'message_detail_field', 'message_timestamp_field', 'message_action_labels', 'message_detail_labels', 'content_slot'])],
  ['LineItemGrid', new Set(['type', 'source', 'title', 'description', 'variant', 'page_size', 'row_key', 'empty_state', 'columns', 'actions', 'footer', 'mount_in'])],
  ['ContactGrid', new Set(['type', 'source', 'title', 'description', 'page_size', 'row_key', 'empty_state', 'columns', 'actions'])],
  ['MoneySummary', new Set(['type', 'source', 'title', 'stats'])],
  ['ApprovalTimeline', new Set(['type', 'source', 'title', 'empty_state', 'action_labels', 'actor_field', 'action_field', 'detail_field', 'timestamp_field'])],
  ['TemplatePreview', new Set(['type', 'id', 'source', 'template_source'])],
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
    'sse',
    'websocket',
    'refresh_interval_ms',
    'search_placeholder',
    'empty_threads',
    'empty_messages',
  ])],
  ['LoginForm', new Set(['type', 'id', 'action', 'logo_title', 'logo_subtitle', 'title', 'email', 'password', 'submit_label', 'loading_label', 'required_message', 'provider_divider', 'credentials_label', 'credentials', 'providers'])],
  ['Html', new Set(['type', 'id', 'tag', 'class', 'text', 'text_expr', 'children'])],
  ['ChoiceGroup', new Set(['type', 'id', 'title', 'value', 'group_class', 'option_class', 'options', 'action'])],
  ['Form', new Set(['type', 'id', 'title', 'class', 'action', 'submit_variant', 'submit_label', 'loading_label', 'success_label', 'fields', 'validation'])],
  ['Button', new Set(['type', 'id', 'action', 'label', 'icon', 'variant', 'full_width'])],
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
  if (input.locale !== undefined) requireString(input.locale, 'locale', issues);
  if (input.scope !== undefined) {
    requireRecord(input.scope, 'scope', issues);
    if (isRecord(input.scope)) {
      rejectUnknownKeys(input.scope, SCOPE_KEYS, 'scope', issues);
      requireString(input.scope.label, 'scope.label', issues);
      requireString(input.scope.value, 'scope.value', issues);
    }
  }
  requireRecord(input.page, 'page', issues);
  if (isRecord(input.page)) {
    rejectUnknownKeys(input.page, PAGE_KEYS, 'page', issues);
    requireString(input.page.id, 'page.id', issues);
    if (input.page.breadcrumb !== undefined) requireStringArray(input.page.breadcrumb, 'page.breadcrumb', issues);
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
  validateDatasources(input.datasources, datasourceIds, options, issues);
  validateActions(input.actions, actionIds, datasourceIds, options, issues);
  validateToolbar(input.toolbar, actionIds, issues);
  validateFilters(input.filters, datasourceIds, options, issues);
  validateComponents(input.components, 'components', datasourceIds, actionIds, options, issues);

  if (issues.length) throw new PageSchemaError(issues);
  return input as PageConfig;
}

function validateDatasources(value: unknown, ids: Set<string>, options: PageValidationOptions, issues: string[]) {
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
    const sourceKinds = options.allowExternalSources && source.data !== undefined
      ? 1
      : [source.query, source.data, source.workflow_states, source.type === 'service' ? source.operation : undefined].filter(value => value !== undefined).length;
    if (sourceKinds !== 1) issues.push(`${path} must define exactly one of query, data, or workflow_states`);
    if (source.query !== undefined) requireString(source.query, `${path}.query`, issues);
    if (source.type !== undefined && source.type !== 'local' && source.type !== 'service') issues.push(`${path}.type must be local or service`);
    if (source.type === 'service') {
      requireString(source.service, `${path}.service`, issues);
      requireString(source.operation, `${path}.operation`, issues);
      if (source.service_params !== undefined) requireRecord(source.service_params, `${path}.service_params`, issues);
    }
    if (source.enrich !== undefined) requireRecord(source.enrich, `${path}.enrich`, issues);
    if (source.query_window !== undefined) validateQueryWindow(source.query_window, `${path}.query_window`, issues);
    if (source.single !== undefined && typeof source.single !== 'boolean') {
      issues.push(`${path}.single must be a boolean`);
    }
    if (source.pivot !== undefined) {
      requireRecord(source.pivot, `${path}.pivot`, issues);
      if (isRecord(source.pivot)) {
        rejectUnknownKeys(source.pivot, new Set(['fields']), `${path}.pivot`, issues);
        if (!Array.isArray(source.pivot.fields) || !source.pivot.fields.length || source.pivot.fields.some((field: unknown) => !isString(field))) {
          issues.push(`${path}.pivot.fields must be a non-empty array of field names`);
        }
      }
    }
    if (source.workflow !== undefined) {
      if (options.allowExternalSources && isRecord(source.workflow)) {
        try {
          validateWorkflowDefinition({ workflow: source.workflow });
        } catch (error) {
          if (error instanceof WorkflowSchemaError) issues.push(...error.issues.map(issue => `${path}.${issue}`));
          else throw error;
        }
      } else requireString(source.workflow, `${path}.workflow`, issues);
    }
    if (source.workflow_states !== undefined) requireString(source.workflow_states, `${path}.workflow_states`, issues);
    if (typeof source.id === 'string') addUnique(ids, source.id, `${path}.id`, 'datasource', issues);
  });
}

function validateQueryWindow(value: unknown, path: string, issues: string[]) {
  requireRecord(value, path, issues);
  if (!isRecord(value)) return;
  rejectUnknownKeys(value, new Set(['table', 'date_field', 'from_param', 'to_param', 'max_years', 'deny_unbounded']), path, issues);
  for (const key of ['table', 'date_field', 'from_param', 'to_param']) {
    if (value[key] !== undefined) requireString(value[key], `${path}.${key}`, issues);
  }
  if (typeof value.table !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value.table)) issues.push(`${path}.table must be a safe identifier`);
  if (typeof value.date_field !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(value.date_field)) issues.push(`${path}.date_field must be a safe identifier`);
  if (value.max_years !== undefined && (!Number.isInteger(value.max_years) || value.max_years <= 0)) issues.push(`${path}.max_years must be a positive integer`);
  if (value.deny_unbounded !== undefined && typeof value.deny_unbounded !== 'boolean') issues.push(`${path}.deny_unbounded must be a boolean`);
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
    if (action.permission !== undefined) requireString(action.permission, `${path}.permission`, issues);
    const type = action.type as ActionDefinition['type'];
    const allowedKeys = ACTION_KEYS[type];
    if (!allowedKeys) {
      issues.push(`${path}.type has unsupported value "${String(action.type)}"`);
      return;
    }
    if (PERMISSION_REQUIRED_ACTION_TYPES.has(type)) {
      requireString(action.permission, `${path}.permission`, issues);
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
    } else if (type === 'event') {
      requireString(action.event, `${path}.event`, issues);
      if (action.params !== undefined && !isRecord(action.params)) {
        issues.push(`${path}.params must be an object`);
      }
    } else if (type === 'server') {
      requireString(action.action, `${path}.action`, issues);
      if (action.handler === 'order_transition') requireString(action.workflow, `${path}.workflow`, issues);
      if (action.params !== undefined && !isRecord(action.params)) {
        issues.push(`${path}.params must be an object`);
      }
      if (action.result !== undefined && action.result !== 'alert') {
        issues.push(`${path}.result must be "alert" when provided`);
      }
      if (action.result_field !== undefined) requireString(action.result_field, `${path}.result_field`, issues);
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
    if (item.icon !== undefined) requireString(item.icon, `${path}.icon`, issues);
    requireString(item.action, `${path}.action`, issues);
    if (item.show_if !== undefined) requireString(item.show_if, `${path}.show_if`, issues);
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
  if (value.all_label !== undefined) requireString(value.all_label, 'filters.all_label', issues);
  if (value.clear_label !== undefined) requireString(value.clear_label, 'filters.clear_label', issues);
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
    if (field.options_source !== undefined) {
      requireString(field.options_source, `${path}.options_source`, issues);
      requireSource(field.options_source, `${path}.options_source`, datasourceIds, options, issues);
    }
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
    if (component.template_source !== undefined) {
      requireString(component.template_source, `${path}.template_source`, issues);
      requireSource(component.template_source, `${path}.template_source`, datasourceIds, options, issues);
    }
    if (component.type === 'OdooFormView') {
      for (const key of ['message_source', 'follower_source', 'follower_candidates_source', 'attachment_source']) {
        if (component[key] !== undefined) requireSource(component[key], `${path}.${key}`, datasourceIds, options, issues);
      }
      for (const key of ['message_action', 'note_action', 'follower_add_action', 'follower_remove_action', 'attachment_upload_action', 'attachment_download_action']) {
        if (component[key] === undefined) continue;
        requireString(component[key], `${path}.${key}`, issues);
        if (typeof component[key] === 'string' && !actionIds.has(component[key])) {
          issues.push(`${path}.${key} references unknown action "${component[key]}"`);
        }
      }
      if (component.header_actions !== undefined) {
        if (!Array.isArray(component.header_actions)) issues.push(`${path}.header_actions must be an array`);
        const headerActions = Array.isArray(component.header_actions) ? component.header_actions : [];
        for (const [index, button] of headerActions.entries()) {
          requireRecord(button, `${path}.header_actions[${index}]`, issues);
          requireString(button.id, `${path}.header_actions[${index}].id`, issues);
          if (typeof button.id === 'string' && !actionIds.has(button.id)) {
            issues.push(`${path}.header_actions[${index}].id references unknown action "${button.id}"`);
          }
        }
      }
    }
    if (component.type === 'LineItemGrid' && component.footer !== undefined) {
      requireRecord(component.footer, `${path}.footer`, issues);
      if (isRecord(component.footer)) {
        requireString(component.footer.source, `${path}.footer.source`, issues);
        requireSource(component.footer.source, `${path}.footer.source`, datasourceIds, options, issues);
        if (!Array.isArray(component.footer.stats) || !component.footer.stats.length) {
          issues.push(`${path}.footer.stats must be a non-empty array`);
        }
      }
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
    if (component.type === 'ListView') {
      if (component.variant !== 'odoo') issues.push(`${path}.variant must be odoo`);
      if (component.scroll !== undefined && !['list', 'body'].includes(String(component.scroll))) {
        issues.push(`${path}.scroll must be list or body`);
      }
      for (const key of ['create_action', 'row_open_action', 'row_double_click_action']) {
        if (component[key] === undefined) continue;
        requireString(component[key], `${path}.${key}`, issues);
        if (typeof component[key] === 'string' && !actionIds.has(component[key])) {
          issues.push(`${path}.${key} references unknown action "${component[key]}"`);
        }
      }
      if (component.row_actions !== undefined && !['buttons', 'menu'].includes(String(component.row_actions))) {
        issues.push(`${path}.row_actions must be buttons or menu`);
      }
      if (component.form_view !== undefined) {
        requireRecord(component.form_view, `${path}.form_view`, issues);
        if (isRecord(component.form_view)) requireString(component.form_view.page, `${path}.form_view.page`, issues);
      }
      if (component.group_by !== undefined) {
        const groups = Array.isArray(component.group_by) ? component.group_by : [component.group_by];
        groups.forEach((group: unknown, index: number) => {
          const groupPath = `${path}.group_by[${index}]`;
          if (typeof group === 'string') return;
          requireRecord(group, groupPath, issues);
          if (isRecord(group)) {
            rejectUnknownKeys(group, new Set(['field', 'label']), groupPath, issues);
            requireString(group.field, `${groupPath}.field`, issues);
            requireString(group.label, `${groupPath}.label`, issues);
          }
        });
      }
      if (component.favorites !== undefined) {
        if (!Array.isArray(component.favorites)) issues.push(`${path}.favorites must be an array`);
        else component.favorites.forEach((favorite: unknown, index: number) => {
          const favoritePath = `${path}.favorites[${index}]`;
          requireRecord(favorite, favoritePath, issues);
          if (!isRecord(favorite)) return;
          requireString(favorite.id, `${favoritePath}.id`, issues);
          requireString(favorite.label, `${favoritePath}.label`, issues);
          if (favorite.filters !== undefined) requireRecord(favorite.filters, `${favoritePath}.filters`, issues);
          if (favorite.group_by !== undefined) requireString(favorite.group_by, `${favoritePath}.group_by`, issues);
        });
      }
      if (component.bulk_actions !== undefined) {
        if (!Array.isArray(component.bulk_actions)) issues.push(`${path}.bulk_actions must be an array`);
        else component.bulk_actions.forEach((action: unknown, index: number) => {
          const actionPath = `${path}.bulk_actions[${index}]`;
          requireRecord(action, actionPath, issues);
          if (!isRecord(action)) return;
          requireString(action.id, `${actionPath}.id`, issues);
          requireString(action.label, `${actionPath}.label`, issues);
          if (typeof action.id === 'string' && !actionIds.has(action.id)) issues.push(`${actionPath}.id references unknown action "${action.id}"`);
        });
      }
      if (component.labels !== undefined) {
        requireRecord(component.labels, `${path}.labels`, issues);
        if (isRecord(component.labels)) {
          rejectUnknownKeys(component.labels, LIST_VIEW_LABEL_KEYS, `${path}.labels`, issues);
          for (const [key, value] of Object.entries(component.labels)) {
            requireString(value, `${path}.labels.${key}`, issues);
          }
        }
      }
      if (component.views !== undefined) {
        if (!Array.isArray(component.views) || !component.views.length) {
          issues.push(`${path}.views must be a non-empty array`);
        } else {
          const viewIds = new Set<string>();
          component.views.forEach((view, viewIndex) => {
            const viewPath = `${path}.views[${viewIndex}]`;
            requireRecord(view, viewPath, issues);
            if (!isRecord(view)) return;
            rejectUnknownKeys(view, new Set(['id', 'label', 'icon', 'group_by', 'date_field', 'end_date_field', 'groups', 'groups_source', 'card', 'row_field', 'column_field', 'row_fields', 'column_fields', 'measure_field', 'measure_label', 'measures', 'aggregate', 'category_field', 'type', 'label_field', 'subtitle_field', 'latitude_field', 'longitude_field', 'pivot']), viewPath, issues);
            requireString(view.id, `${viewPath}.id`, issues);
            requireString(view.label, `${viewPath}.label`, issues);
            if (!['list', 'kanban', 'calendar', 'card', 'form', 'pivot', 'graph', 'map'].includes(String(view.id))) issues.push(`${viewPath}.id must be list, kanban, calendar, card, form, pivot, graph, or map`);
            if (typeof view.id === 'string' && viewIds.has(view.id)) issues.push(`${viewPath}.id must be unique`);
            if (typeof view.id === 'string') viewIds.add(view.id);
            if (view.id === 'kanban' && typeof view.group_by !== 'string') issues.push(`${viewPath}.group_by is required for kanban`);
            if (view.id === 'calendar' && typeof view.date_field !== 'string') issues.push(`${viewPath}.date_field is required for calendar`);
            if (view.id === 'pivot') {
              if (view.pivot !== undefined) {
                requireRecord(view.pivot, `${viewPath}.pivot`, issues);
                if (isRecord(view.pivot)) {
                  rejectUnknownKeys(view.pivot, new Set(['fields', 'default', 'config_label', 'date_ranges']), `${viewPath}.pivot`, issues);
                  if (!Array.isArray(view.pivot.fields) || !view.pivot.fields.length) issues.push(`${viewPath}.pivot.fields must be a non-empty array`);
                  for (const [fieldIndex, field] of (Array.isArray(view.pivot.fields) ? view.pivot.fields : []).entries()) {
                    const fieldPath = `${viewPath}.pivot.fields[${fieldIndex}]`;
                    requireRecord(field, fieldPath, issues);
                    if (isRecord(field)) { rejectUnknownKeys(field, new Set(['field', 'column', 'type']), fieldPath, issues); requireString(field.field, `${fieldPath}.field`, issues); requireString(field.column, `${fieldPath}.column`, issues); if (field.type !== undefined && field.type !== 'date') issues.push(`${fieldPath}.type must be date when provided`); }
                  }
                  if (view.pivot.date_ranges !== undefined) {
                    requireRecord(view.pivot.date_ranges, `${viewPath}.pivot.date_ranges`, issues);
                    if (isRecord(view.pivot.date_ranges)) for (const [field, range] of Object.entries(view.pivot.date_ranges)) {
                      if (!['day', 'week', 'month', 'quarter', 'year'].includes(String(range))) issues.push(`${viewPath}.pivot.date_ranges.${field} must be day, week, month, quarter, or year`);
                    }
                  }
                  if (view.pivot.default !== undefined) {
                    requireRecord(view.pivot.default, `${viewPath}.pivot.default`, issues);
                    if (isRecord(view.pivot.default)) { rejectUnknownKeys(view.pivot.default, new Set(['rows', 'columns', 'measures']), `${viewPath}.pivot.default`, issues); }
                  }
                }
              }
              if (view.row_fields !== undefined && (!Array.isArray(view.row_fields) || view.row_fields.some((field: unknown) => !isString(field)))) issues.push(`${viewPath}.row_fields must be an array of field names`);
              if (view.column_fields !== undefined && (!Array.isArray(view.column_fields) || view.column_fields.some((field: unknown) => !isString(field)))) issues.push(`${viewPath}.column_fields must be an array of field names`);
              if (view.measures !== undefined && (!Array.isArray(view.measures) || !view.measures.length)) issues.push(`${viewPath}.measures must be a non-empty array`);
            }
            if (view.id === 'graph' && typeof view.category_field !== 'string') issues.push(`${viewPath}.category_field is required for graph`);
            if (view.id === 'map' && typeof view.label_field !== 'string') issues.push(`${viewPath}.label_field is required for map`);
          });
        }
      }
    }
    if (component.type === 'ApprovalTimeline' && component.action_labels !== undefined) {
      if (!isRecord(component.action_labels)) {
        issues.push(`${path}.action_labels must be an object`);
      } else {
        for (const [key, value] of Object.entries(component.action_labels)) {
          if (typeof value !== 'string' || !value.trim()) issues.push(`${path}.action_labels.${key} must be a non-empty string`);
        }
      }
    }
    if (component.type === 'Chart') {
      if (component.color !== undefined && (!isString(component.color) || !CHART_COLORS.has(component.color))) {
        issues.push(`${path}.color must be a semantic chart color`);
      }
      if (Array.isArray(component.series)) {
        component.series.forEach((series, seriesIndex) => {
          if (isRecord(series) && series.color !== undefined && (!isString(series.color) || !CHART_COLORS.has(series.color))) {
            issues.push(`${path}.series[${seriesIndex}].color must be a semantic chart color`);
          }
        });
      }
    }

    validateColumns(component.columns, `${path}.columns`, actionIds, issues);
    validateTabs(component.tabs, `${path}.tabs`, datasourceIds, actionIds, options, issues);
    validateStats(component.stats, `${path}.stats`, issues);
    validateSearch(component.search, `${path}.search`, issues);
    validateDateRange(component.date_range, `${path}.date_range`, issues);
    validateToolbarFilters(component.filters, `${path}.filters`, datasourceIds, options, issues);
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
    if (field.show_if !== undefined) requireString(field.show_if, `${fieldPath}.show_if`, issues);
    if (field.options !== undefined) validateOptionList(field.options, `${fieldPath}.options`, issues);
    if (field.tokens !== undefined) {
      if (!Array.isArray(field.tokens) || field.tokens.some(token => typeof token !== 'string')) {
        issues.push(`${fieldPath}.tokens must be an array of strings`);
      }
    }
  });
}

function validateOptionList(value: unknown, path: string, issues: string[]) {
  if (!Array.isArray(value)) {
    issues.push(`${path} must be an array`);
    return;
  }
  value.forEach((option, index) => {
    if (option === null || typeof option !== 'object') return;
    const optionPath = `${path}[${index}]`;
    requireRecord(option, optionPath, issues);
    if (!isRecord(option)) return;
    rejectUnknownKeys(option, new Set(['id', 'value', 'code', 'label', 'name']), optionPath, issues);
    if (option.id === undefined && option.value === undefined && option.code === undefined) {
      issues.push(`${optionPath} must define id, value, or code`);
    }
    if (option.label === undefined && option.name === undefined) {
      issues.push(`${optionPath} must define label or name`);
    }
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
          if (action.icon !== undefined) requireString(action.icon, `${actionPath}.icon`, issues);
          if (action.permission !== undefined) requireString(action.permission, `${actionPath}.permission`, issues);
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
    if (stat.navigate_to !== undefined) requireString(stat.navigate_to, `${statPath}.navigate_to`, issues);
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
  for (const key of ['from_field', 'to_field', 'from_label', 'to_label', 'label']) {
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
  if (value.preset_labels !== undefined) {
    requireRecord(value.preset_labels, `${path}.preset_labels`, issues);
    if (isRecord(value.preset_labels)) {
      const allowed = new Set(['today', 'previous_month', 'week', 'month', 'quarter', 'year', 'last_12_months', 'all']);
      for (const [key, label] of Object.entries(value.preset_labels)) {
        if (!allowed.has(key)) issues.push(`${path}.preset_labels.${key} is not a supported preset`);
        requireString(label, `${path}.preset_labels.${key}`, issues);
      }
    }
  }
  if (value.preset_style !== undefined && value.preset_style !== 'select' && value.preset_style !== 'segmented') {
    issues.push(`${path}.preset_style must be select or segmented`);
  }
  if (value.max_years !== undefined && (!Number.isInteger(value.max_years) || value.max_years <= 0)) issues.push(`${path}.max_years must be a positive integer`);
  if (value.deny_unbounded !== undefined && typeof value.deny_unbounded !== 'boolean') issues.push(`${path}.deny_unbounded must be a boolean`);
}

function validateToolbarFilters(
  value: unknown,
  path: string,
  datasourceIds: Set<string>,
  options: PageValidationOptions,
  issues: string[],
) {
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
    if (filter.options_source !== undefined) {
      requireString(filter.options_source, `${filterPath}.options_source`, issues);
      requireSource(filter.options_source, `${filterPath}.options_source`, datasourceIds, options, issues);
    } else if (!Array.isArray(filter.options)) {
      issues.push(`${filterPath}.options must be an array`);
    }
    if (Array.isArray(filter.options)) {
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
