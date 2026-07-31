type Screen = {
  id: string;
  route: string;
  title: string;
  state?: Record<string, unknown>;
  on_load?: string;
  events?: Record<string, string>;
  components: Component[];
};
type Component = Record<string, any> & { type: string; children?: Component[]; event?: string; on_change?: string; visible_when?: string };
type Datasource = { resource: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE'; collection?: boolean; action?: string };
type Definition = { datasources: Record<string, Datasource>; screens: Screen[]; navigation?: { label: string; to: string }[] };

class YamlScreenEngine {
  private definition!: Definition;
  private screen!: Screen;
  private route: Record<string, string> = {};
  private data: Record<string, any> = {};
  private state: Record<string, any> = {};
  private form: Record<string, any> = {};
  private error = '';

  constructor(private readonly root: HTMLElement) {}

  async start() {
    this.definition = await this.fetchJson('/api/ui');
    window.addEventListener('popstate', () => void this.loadLocation());
    await this.loadLocation();
  }

  private async loadLocation() {
    const pathname = location.pathname;
    const match = this.definition.screens.map(screen => ({ screen, params: this.matchRoute(screen.route, pathname) })).find(item => item.params);
    if (!match) return this.showFatal('Screen route not found.');
    this.screen = match.screen;
    this.route = match.params!;
    this.data = {};
    this.state = { ...(this.screen.state || {}) };
    this.form = {};
    this.error = '';
    document.title = `${this.screen.title} — CRM`;
    try {
      if (this.screen.on_load) await this.run(this.screen.on_load);
      this.render();
    } catch (error) {
      this.showFatal(error instanceof Error ? error.message : 'Unable to load screen.');
    }
  }

  private matchRoute(pattern: string, pathname: string) {
    const expected = pattern.split('/').filter(Boolean);
    const actual = pathname.split('/').filter(Boolean);
    if (expected.length !== actual.length) return null;
    const params: Record<string, string> = {};
    for (let index = 0; index < expected.length; index += 1) {
      if (expected[index].startsWith(':')) params[expected[index].slice(1)] = decodeURIComponent(actual[index]);
      else if (expected[index] !== actual[index]) return null;
    }
    return params;
  }

  private async request(id: string, values: Record<string, unknown> = {}, key?: string) {
    const source = this.definition.datasources[id];
    if (!source) throw new Error(`Unknown datasource: ${id}`);
    const path = `/api/odata/${source.resource}${key ? `('${encodeURIComponent(key)}')` : ''}${source.action ? `/${source.action}` : ''}`;
    const options: RequestInit = { method: source.method, headers: { Accept: 'application/json' } };
    if (source.method === 'GET') {
      const query = new URLSearchParams(Object.entries(values).filter(([, value]) => value !== undefined && value !== '').map(([name, value]) => [name, String(value)]));
      const response = await fetch(query.size ? `${path}?${query}` : path, options);
      return this.readResponse(response);
    }
    options.headers = { ...options.headers, 'Content-Type': 'application/json' };
    options.body = JSON.stringify(values);
    return this.readResponse(await fetch(path, options));
  }

  private async readResponse(response: Response) {
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(String(value.error || `Request failed (${response.status})`));
    return value;
  }

  private context(event: Record<string, any> = {}) {
    return {
      route: this.route,
      state: this.state,
      data: this.data,
      event,
      formValues: () => ({ ...this.form }),
      load: async (id: string, target: string, values: Record<string, unknown> = {}, key?: string) => {
        this.data[target] = await this.request(id, values, key);
        return this.data[target];
      },
      request: (id: string, values: Record<string, unknown> = {}, key?: string) => this.request(id, values, key),
      navigate: (path: string) => this.navigate(path),
      render: () => this.render(),
    };
  }

  private async run(source: string, event: Record<string, any> = {}) {
    const action = new Function('ctx', `return (async () => { ${source}\n})()`);
    return action(this.context(event));
  }

  private navigate(path: string) {
    history.pushState({}, '', path);
    void this.loadLocation();
  }

  private resolve(value: any): any {
    if (typeof value !== 'string') return value;
    if (!value.startsWith('$')) return value;
    const [root, ...parts] = value.slice(1).split('.');
    let current: any = root === 'data' ? this.data : root === 'state' ? this.state : root === 'route' ? this.route : root === 'form' ? this.form : undefined;
    for (const part of parts) current = current?.[part];
    return current;
  }

  private visible(component: Component) {
    if (!component.visible_when) return true;
    return Boolean(new Function('ctx', `return (${component.visible_when});`)(this.context()));
  }

  private render() {
    this.root.replaceChildren();
    const page = document.createElement('main');
    page.className = 'yaml-crm';
    if (this.error) {
      const message = document.createElement('p');
      message.className = 'yaml-error';
      message.textContent = this.error;
      page.append(message);
    }
    if (this.definition.navigation?.length) page.append(this.renderComponent({ type: 'nav', class: 'yaml-nav', items: this.definition.navigation }));
    for (const component of this.screen.components) page.append(this.renderComponent(component));
    this.root.append(page);
  }

  private renderComponent(component: Component): HTMLElement {
    if (!this.visible(component)) return document.createElement('span');
    const element = document.createElement(component.type === 'heading' ? 'h1' : component.type === 'text' ? 'p' : component.type === 'button' ? 'button' : component.type === 'input' ? 'input' : component.type === 'select' ? 'select' : component.type === 'table' ? 'table' : component.type === 'form' ? 'form' : component.type === 'nav' ? 'nav' : 'section');
    element.className = `yaml-${component.type}${component.class ? ` ${component.class}` : ''}`;
    if (component.type === 'heading' || component.type === 'text') element.textContent = String(this.resolve(component.text) || '');
    if (component.type === 'button') {
      element.setAttribute('type', component.submit ? 'submit' : 'button');
      element.textContent = component.label;
      if (!component.submit) element.addEventListener('click', () => void this.trigger(component.event));
    }
    if (component.type === 'input') {
      const input = element as HTMLInputElement;
      input.type = component.input_type || 'text'; input.placeholder = component.placeholder || ''; input.name = component.name || '';
      input.value = String(this.resolve(component.binding) ?? '');
      input.required = Boolean(component.required);
      input.addEventListener('input', () => this.setBinding(component.binding, input.value));
      if (component.on_change) input.addEventListener('change', () => void this.trigger(component.on_change));
    }
    if (component.type === 'select') {
      const select = element as HTMLSelectElement;
      select.name = component.name || '';
      for (const optionDefinition of this.resolve(component.options) || []) {
        const option = document.createElement('option'); option.value = optionDefinition[component.option_value || 'value']; option.textContent = optionDefinition[component.option_label || 'label']; select.append(option);
      }
      select.value = String(this.resolve(component.binding) ?? '');
      select.addEventListener('change', () => { this.setBinding(component.binding, select.value); if (component.on_change) void this.trigger(component.on_change); });
    }
    if (component.type === 'table') this.renderTable(element as HTMLTableElement, component);
    if (component.type === 'form') this.renderForm(element as HTMLFormElement, component);
    if (component.type === 'nav') this.renderNavigation(element, component);
    if (component.type === 'kanban') this.renderKanban(element, component);
    for (const child of component.children || []) element.append(this.renderComponent(child));
    return element;
  }

  private renderTable(table: HTMLTableElement, component: Component) {
    const rows = this.resolve(component.rows) || [];
    const columns = component.columns || [];
    const head = table.createTHead().insertRow();
    for (const column of columns) { const cell = document.createElement('th'); cell.textContent = column.label; head.append(cell); }
    const body = table.createTBody();
    for (const row of rows) {
      const line = body.insertRow();
      if (component.row_event) { line.tabIndex = 0; line.addEventListener('click', () => void this.trigger(component.row_event, { row })); }
      for (const column of columns) { const cell = line.insertCell(); cell.textContent = String(row[column.field] ?? ''); }
    }
  }

  private renderForm(form: HTMLFormElement, component: Component) {
    this.form = Object.keys(this.form).length ? this.form : { ...(this.resolve(component.record) || {}) };
    form.addEventListener('submit', event => { event.preventDefault(); void this.trigger(component.submit); });
    for (const field of component.fields || []) {
      const label = document.createElement('label'); label.textContent = field.label;
      const input = field.type === 'textarea' ? document.createElement('textarea') : document.createElement(field.type === 'select' ? 'select' : 'input');
      input.name = field.name; input.required = Boolean(field.required);
      if (input instanceof HTMLInputElement) input.type = ['email', 'number', 'date'].includes(field.type) ? field.type : 'text';
      if (input instanceof HTMLSelectElement) for (const optionDefinition of this.resolve(field.options) || []) { const option = document.createElement('option'); option.value = optionDefinition[field.option_value || 'value']; option.textContent = optionDefinition[field.option_label || 'label']; input.append(option); }
      input.value = String(this.form[field.name] ?? '');
      input.addEventListener('input', () => { this.form[field.name] = input.value; });
      input.addEventListener('change', () => { this.form[field.name] = input.value; });
      label.append(input); form.append(label);
    }
    const actions = document.createElement('div'); actions.className = 'yaml-actions';
    for (const action of component.actions || []) actions.append(this.renderComponent({ type: 'button', ...action }));
    form.append(actions);
  }

  private renderNavigation(nav: HTMLElement, component: Component) {
    for (const item of component.items || []) {
      const link = document.createElement('a');
      link.href = item.to; link.textContent = item.label;
      if (location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(`${item.to}/`))) link.className = 'active';
      link.addEventListener('click', event => { event.preventDefault(); this.navigate(item.to); });
      nav.append(link);
    }
  }

  private renderKanban(board: HTMLElement, component: Component) {
    const rows = this.resolve(component.rows) || [];
    const configuredGroups = this.resolve(component.groups);
    const groups = configuredGroups || [...new Set(rows.map((row: any) => row[component.group_field]))];
    board.classList.add('yaml-kanban');
    for (const configuredGroup of groups) {
      const group = typeof configuredGroup === 'object' ? configuredGroup[component.group_value || 'id'] : configuredGroup;
      const column = document.createElement('section'); column.className = 'yaml-kanban-column';
      const title = document.createElement('h2'); title.textContent = typeof configuredGroup === 'object' ? configuredGroup[component.group_label || 'name'] : component.group_labels?.[group] || String(group); column.append(title);
      for (const row of rows.filter((item: any) => item[component.group_field] === group)) {
        const card = document.createElement('button'); card.type = 'button'; card.className = 'yaml-kanban-card';
        card.textContent = [row[component.title_field], ...(component.detail_fields || []).map((field: string) => row[field]).filter(Boolean)].join('\n');
        card.addEventListener('click', () => void this.trigger(component.row_event, { row })); column.append(card);
      }
      board.append(column);
    }
  }

  private setBinding(binding: string, value: unknown) {
    if (!binding?.startsWith('$')) return;
    const [root, ...parts] = binding.slice(1).split('.');
    const target = root === 'state' ? this.state : root === 'form' ? this.form : undefined;
    if (!target || !parts.length) return;
    let current = target;
    for (const part of parts.slice(0, -1)) current = current[part] ||= {};
    current[parts.at(-1)!] = value;
  }

  private async trigger(name?: string, event: Record<string, any> = {}) {
    const source = name ? this.screen.events?.[name] : undefined;
    if (!source) return;
    this.error = '';
    try { await this.run(source, event); this.render(); } catch (error) { this.error = error instanceof Error ? error.message : 'Action failed.'; this.render(); }
  }

  private showFatal(message: string) { this.root.textContent = message; }
  private async fetchJson(path: string) { const response = await fetch(path); if (!response.ok) throw new Error(`Unable to load ${path}`); return response.json(); }
}

const app = document.querySelector('#app');
if (!app) throw new Error('Missing application root');
void new YamlScreenEngine(app as HTMLElement).start();
