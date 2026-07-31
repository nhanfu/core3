import { HTML } from './html.ts';
import { FavoritesStore } from './services/FavoritesStore.ts';

export type Screen = {
  id: string;
  route: string;
  title: string;
  state?: Record<string, unknown>;
  on_load?: string;
  events?: Record<string, string>;
  components: Component[];
};
export type Component = Record<string, any> & {
  type: string;
  children?: Component[];
  event?: string;
  on_change?: string;
  visible_when?: string;
};
export type Datasource = {
  resource: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  collection?: boolean;
  action?: string;
};
export type Definition = {
  application?: { id: string; name: string };
  datasources: Record<string, Datasource>;
  screens: Screen[];
  navigation?: { label: string; to: string }[];
  shell?: ShellDefinition;
};

export type ShellNavItem = {
  id: string;
  label: string;
  icon?: string;
  to?: string;
  children?: ShellNavItem[];
};

export type ShellDefinition = {
  app_name?: string;
  app_icon?: string;
  company_name?: string;
  user_name?: string;
  nav?: ShellNavItem[];
};

/** Renders the declarative YAML screens supplied by any Core3 application. */
export class YamlScreenEngine {
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
    const match = this.definition.screens
      .map(screen => ({ screen, params: this.matchRoute(screen.route, location.pathname) }))
      .find(item => item.params);
    if (!match) return this.showFatal('Screen route not found.');
    this.screen = match.screen;
    this.route = match.params!;
    this.data = {};
    this.state = { ...(this.screen.state || {}) };
    this.form = {};
    this.error = '';
    document.title = `${this.screen.title} — ${this.definition.application?.name || 'Core3'}`;
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
      const query = new URLSearchParams(Object.entries(values)
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([name, value]) => [name, String(value)]));
      return this.readResponse(await fetch(query.size ? `${path}?${query}` : path, options));
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
      query: Object.fromEntries(new URLSearchParams(location.search)),
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
    if (typeof value !== 'string' || !value.startsWith('$')) return value;
    const [root, ...parts] = value.slice(1).split('.');
    let current: any = root === 'data' ? this.data : root === 'state' ? this.state : root === 'route' ? this.route : root === 'form' ? this.form : undefined;
    for (const part of parts) current = current?.[part];
    return current;
  }

  private visible(component: Component) {
    return !component.visible_when || Boolean(new Function('ctx', `return (${component.visible_when});`)(this.context()));
  }

  private element<T extends HTMLElement = HTMLElement>(tag: string, className?: string) {
    const builder = new HTML().create(tag);
    if (className) builder.className(className);
    return builder.getContext() as T;
  }

  private render() {
    new HTML().take(this.root).clear();
    const page = this.element('main', 'yaml-crm');
    if (this.error) {
      const message = this.element('p', 'yaml-error');
      message.textContent = this.error;
      page.append(message);
    }
    if (this.definition.navigation?.length) page.append(this.renderComponent({ type: 'nav', class: 'yaml-nav', items: this.definition.navigation }));
    for (const component of this.screen.components) page.append(this.renderComponent(component));
    if (this.definition.shell) this.root.append(this.renderShell(page));
    else this.root.append(page);
  }

  private renderShell(content: HTMLElement) {
    const shell = this.element('div', 'odoo-shell');
    const sidebar = this.element('aside', 'odoo-sidebar');
    const definition = this.definition.shell!;
    const brand = this.element('div', 'odoo-brand');
    const mark = this.element('span', 'odoo-brand-mark');
    mark.textContent = definition.app_icon || 'CRM';
    const brandText = this.element('div');
    const appName = this.element('strong'); appName.textContent = definition.app_name || this.definition.application?.name || 'CRM';
    const company = this.element('small'); company.textContent = definition.company_name || 'My Company';
    brandText.append(appName, company); brand.append(mark, brandText);
    sidebar.append(brand);
    const menuTitle = this.element('div', 'odoo-sidebar-label'); menuTitle.textContent = definition.app_name || 'CRM'; sidebar.append(menuTitle);
    const nav = this.element('nav', 'odoo-nav');
    this.renderShellNav(nav, definition.nav || []);
    sidebar.append(nav);

    const main = this.element('main', 'odoo-main');
    const header = this.element('header', 'odoo-topbar');
    const menuButton = this.element<HTMLButtonElement>('button', 'odoo-icon-button odoo-sidebar-button');
    menuButton.type = 'button'; menuButton.textContent = '☰'; menuButton.title = 'Menu';
    menuButton.addEventListener('click', () => shell.classList.toggle('is-sidebar-open'));
    const breadcrumb = this.element('div', 'odoo-breadcrumb'); breadcrumb.textContent = `${definition.app_name || 'CRM'} / ${this.screen.title}`;
    const spacer = this.element('div', 'odoo-topbar-spacer');
    const notifications = this.element<HTMLButtonElement>('button', 'odoo-icon-button odoo-notification');
    notifications.type = 'button'; notifications.textContent = '♢'; notifications.title = 'Notifications';
    const user = this.element<HTMLButtonElement>('button', 'odoo-user-menu');
    user.type = 'button'; user.textContent = definition.user_name || 'Administrator';
    header.append(menuButton, breadcrumb, spacer, notifications, user);
    const contentHost = this.element('section', 'odoo-content'); contentHost.append(content);
    main.append(header, contentHost); shell.append(sidebar, main);
    return shell;
  }

  private renderShellNav(container: HTMLElement, items: ShellNavItem[], level = 0) {
    for (const item of items) {
      const button = this.element<HTMLButtonElement>('button', `odoo-nav-item odoo-nav-level-${level}`);
      button.type = 'button';
      if (item.icon) { const icon = this.element('span'); icon.textContent = item.icon; button.append(icon); }
      const label = this.element('span'); label.textContent = item.label; button.append(label);
      const active = item.to && (location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(`${item.to}/`)));
      if (active) button.classList.add('is-active');
      if (item.to) button.addEventListener('click', () => this.navigate(item.to!));
      else if (item.children?.length) button.classList.add('is-group');
      container.append(button);
      if (item.children?.length) {
        const children = this.element('div', 'odoo-nav-children');
        this.renderShellNav(children, item.children, level + 1); container.append(children);
      }
    }
  }

  private renderComponent(component: Component): HTMLElement {
    if (!this.visible(component)) return this.element('span');
    const tags: Record<string, string> = { heading: 'h1', text: 'p', button: 'button', input: 'input', select: 'select', table: 'table', form: 'form', nav: 'nav' };
    const element = this.element(tags[component.type] || 'section', `yaml-${component.type}${component.class ? ` ${component.class}` : ''}`);
    if (component.type === 'heading' || component.type === 'text') element.textContent = String(this.resolve(component.text) || '');
    if (component.type === 'button') {
      const button = element as HTMLButtonElement;
      button.type = component.submit ? 'submit' : 'button';
      button.textContent = component.label;
      button.disabled = Boolean(component.disabled_when && new Function('ctx', `return (${component.disabled_when});`)(this.context()));
      if (!component.submit) button.addEventListener('click', () => void this.trigger(component.event));
    }
    if (component.type === 'input') this.renderInput(element as HTMLInputElement, component);
    if (component.type === 'select') this.renderSelect(element as HTMLSelectElement, component);
    if (component.type === 'table') this.renderTable(element as HTMLTableElement, component);
    if (component.type === 'form') this.renderForm(element as HTMLFormElement, component);
    if (component.type === 'statusbar') this.renderStatusbar(element, component);
    if (component.type === 'chatter') this.renderChatter(element, component);
    if (component.type === 'dialog') this.renderDialog(element, component);
    if (component.type === 'nav') this.renderNavigation(element, component);
    if (component.type === 'kanban') this.renderKanban(element, component);
    if (component.type === 'chart') this.renderChart(element, component);
    if (component.type === 'pivot') this.renderPivot(element, component);
    if (component.type === 'calendar') this.renderCalendar(element, component);
    if (component.type === 'favorites') this.renderFavorites(element, component);
    if (component.type === 'domain_builder') this.renderDomainBuilder(element, component);
    for (const child of component.children || []) element.append(this.renderComponent(child));
    return element;
  }

  private renderInput(input: HTMLInputElement, component: Component) {
    input.type = component.input_type || 'text';
    input.placeholder = component.placeholder || '';
    input.name = component.name || '';
    input.value = String(this.resolve(component.binding) ?? '');
    input.required = Boolean(component.required);
    input.addEventListener('input', () => this.setBinding(component.binding, input.value));
    if (component.on_change) input.addEventListener('change', () => void this.trigger(component.on_change));
  }

  private renderSelect(select: HTMLSelectElement, component: Component) {
    select.name = component.name || '';
    for (const definition of this.resolve(component.options) || []) {
      const option = this.element<HTMLOptionElement>('option');
      option.value = String(definition[component.option_value || 'value']);
      option.textContent = String(definition[component.option_label || 'label']);
      select.append(option);
    }
    select.value = String(this.resolve(component.binding) ?? '');
    select.addEventListener('change', () => {
      this.setBinding(component.binding, select.value);
      if (component.on_change) void this.trigger(component.on_change);
    });
  }

  private renderTable(table: HTMLTableElement, component: Component) {
    const rows = this.resolve(component.rows) || [];
    const columns = component.columns || [];
    const groupField = this.resolve(component.group_by);
    const head = table.createTHead().insertRow();
    for (const column of columns) { const cell = this.element('th'); cell.textContent = column.label; head.append(cell); }
    const body = table.createTBody();
    const grouped = groupField
      ? [...rows.reduce((groups: Map<string, any[]>, row: any) => {
        const key = String(row[groupField] ?? 'Unspecified');
        groups.set(key, [...(groups.get(key) || []), row]);
        return groups;
      }, new Map<string, any[]>()).entries()]
      : [['', rows] as [string, any[]]];
    for (const [group, groupRows] of grouped) {
      if (groupField) {
        const groupLine = body.insertRow(); groupLine.className = 'odoo-list-group';
        const groupCell = groupLine.insertCell(); groupCell.colSpan = columns.length; groupCell.textContent = `${group} (${groupRows.length})`;
      }
      for (const row of groupRows) {
      const line = body.insertRow();
      if (component.row_event) { line.tabIndex = 0; line.addEventListener('click', () => void this.trigger(component.row_event, { row })); }
      for (const column of columns) { const cell = line.insertCell(); cell.textContent = String(row[column.field] ?? ''); }
      }
    }
  }

  private renderForm(form: HTMLFormElement, component: Component) {
    this.form = Object.keys(this.form).length ? this.form : { ...(this.resolve(component.record) || {}) };
    form.addEventListener('submit', event => { event.preventDefault(); void this.trigger(component.submit); });
    for (const field of component.fields || []) {
      const label = this.element('label');
      label.textContent = field.label;
      const input = this.element<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(field.type === 'textarea' ? 'textarea' : field.type === 'select' ? 'select' : 'input');
      input.name = field.name;
      input.required = Boolean(field.required);
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) input.placeholder = field.placeholder || '';
      if (input instanceof HTMLInputElement) input.type = ['email', 'number', 'date'].includes(field.type) ? field.type : 'text';
      if (input instanceof HTMLSelectElement) for (const definition of this.resolve(field.options) || []) {
        const option = this.element<HTMLOptionElement>('option');
        option.value = String(definition[field.option_value || 'value']);
        option.textContent = String(definition[field.option_label || 'label']);
        input.append(option);
      }
      input.value = String(this.form[field.name] ?? '');
      input.addEventListener('input', () => { this.form[field.name] = input.value; });
      input.addEventListener('change', () => { this.form[field.name] = input.value; });
      label.append(input);
      form.append(label);
    }
    const actions = this.element('div', 'yaml-actions');
    for (const action of component.actions || []) actions.append(this.renderComponent({ type: 'button', ...action }));
    form.append(actions);
  }

  private renderStatusbar(container: HTMLElement, component: Component) {
    container.classList.add('odoo-statusbar');
    const current = this.resolve(component.binding);
    for (const option of this.resolve(component.options) || []) {
      const value = String(typeof option === 'object' ? option[component.option_value || 'id'] : option);
      const label = String(typeof option === 'object' ? option[component.option_label || 'name'] : option);
      const stage = this.element<HTMLButtonElement>('button', 'odoo-statusbar-stage');
      stage.type = 'button'; stage.textContent = label; stage.dataset.value = value;
      stage.classList.toggle('is-current', value === String(current ?? ''));
      stage.addEventListener('click', () => {
        this.setBinding(component.binding, value);
        void this.trigger(component.event, { value });
      });
      container.append(stage);
    }
  }

  private renderChatter(container: HTMLElement, component: Component) {
    container.classList.add('odoo-chatter');
    const title = this.element('h2'); title.textContent = component.title || 'Chatter'; container.append(title);
    const messages = this.resolve(component.messages) || [];
    const messageList = this.element('div', 'odoo-chatter-messages');
    if (!messages.length) {
      const empty = this.element('p'); empty.textContent = 'No messages yet.'; messageList.append(empty);
    }
    for (const message of messages) {
      const item = this.element('article', 'odoo-message');
      const author = this.element('strong'); author.textContent = String(message.author || '');
      const body = this.element('p'); body.textContent = String(message.body || '');
      const created = this.element('small', 'odoo-muted'); created.textContent = String(message.created_at || '');
      item.append(author, body, created); messageList.append(item);
    }
    container.append(messageList);
    const composer = this.element('div', 'odoo-chatter-compose');
    const messageInput = this.element<HTMLTextAreaElement>('textarea', 'odoo-chatter-input');
    messageInput.placeholder = component.placeholder || 'Log a note… Use @mentions';
    messageInput.value = String(this.resolve(component.message_binding) ?? '');
    messageInput.addEventListener('input', () => this.setBinding(component.message_binding, messageInput.value));
    const send = this.element<HTMLButtonElement>('button', 'odoo-button primary');
    send.type = 'button'; send.textContent = component.send_label || 'Send';
    send.addEventListener('click', () => void this.trigger(component.send_event));
    composer.append(messageInput, send); container.append(composer);

    const followers = this.element('div', 'odoo-chatter-section');
    const followerTitle = this.element('strong'); followerTitle.textContent = 'Followers'; followers.append(followerTitle);
    const followerList = this.element('div', 'odoo-tags');
    for (const follower of this.resolve(component.followers) || []) {
      const tag = this.element('span'); tag.textContent = String(follower.name || ''); followerList.append(tag);
    }
    const followerInput = this.element<HTMLInputElement>('input', 'odoo-chatter-input');
    followerInput.placeholder = 'Add follower…';
    followerInput.value = String(this.resolve(component.follower_binding) ?? '');
    followerInput.addEventListener('input', () => this.setBinding(component.follower_binding, followerInput.value));
    const follow = this.element<HTMLButtonElement>('button', 'odoo-button');
    follow.type = 'button'; follow.textContent = component.follow_label || 'Follow';
    follow.addEventListener('click', () => void this.trigger(component.follow_event));
    followers.append(followerList, followerInput, follow); container.append(followers);

    if (component.attachments) {
      const attachments = this.element('div', 'odoo-chatter-section');
      const attachmentTitle = this.element('strong'); attachmentTitle.textContent = 'Attachments'; attachments.append(attachmentTitle);
      for (const attachment of this.resolve(component.attachments) || []) {
        const item = this.element('p'); item.textContent = `${attachment.name} (${attachment.mime_type})`; attachments.append(item);
      }
      container.append(attachments);
    }
  }

  private renderDialog(container: HTMLElement, component: Component) {
    container.className = 'odoo-dialog-backdrop';
    const dialog = this.element('section', 'odoo-dialog');
    const header = this.element('header', 'odoo-dialog-header');
    const title = this.element('h2'); title.textContent = component.title || 'Action';
    const close = this.element<HTMLButtonElement>('button', 'odoo-dialog-close');
    close.type = 'button'; close.textContent = '×'; close.title = 'Close';
    close.addEventListener('click', () => void this.trigger(component.close_event));
    header.append(title, close); dialog.append(header);
    if (component.message) { const message = this.element('p', 'odoo-dialog-message'); message.textContent = component.message; dialog.append(message); }
    const body = this.element('div', 'odoo-dialog-body');
    for (const field of component.fields || []) {
      const label = this.element('label', 'odoo-dialog-field'); label.textContent = field.label;
      const control = this.element<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(field.type === 'textarea' ? 'textarea' : field.type === 'select' ? 'select' : 'input');
      control.name = field.name || '';
      if (control instanceof HTMLInputElement) control.type = ['email', 'number', 'date'].includes(field.type) ? field.type : 'text';
      if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) control.placeholder = field.placeholder || '';
      control.required = Boolean(field.required);
      if (control instanceof HTMLSelectElement) {
        for (const optionDefinition of this.resolve(field.options) || []) {
          const option = this.element<HTMLOptionElement>('option');
          option.value = String(typeof optionDefinition === 'object' ? optionDefinition[field.option_value || 'value'] : optionDefinition);
          option.textContent = String(typeof optionDefinition === 'object' ? optionDefinition[field.option_label || 'label'] : optionDefinition);
          control.append(option);
        }
      }
      control.value = String(this.resolve(field.binding) ?? field.default ?? '');
      const update = () => this.setBinding(field.binding, control.value);
      control.addEventListener('input', update); control.addEventListener('change', update);
      label.append(control); body.append(label);
    }
    if (component.records) {
      const records = this.resolve(component.records) || [];
      const selected = new Set((this.resolve(component.select_binding) || []).map((value: unknown) => String(value)));
      const table = this.element<HTMLTableElement>('table', 'odoo-list');
      const head = table.createTHead().insertRow();
      const selectHead = this.element('th'); selectHead.textContent = 'Select'; head.append(selectHead);
      for (const column of component.columns || []) { const cell = this.element('th'); cell.textContent = column.label; head.append(cell); }
      const tableBody = table.createTBody();
      for (const record of records) {
        const row = tableBody.insertRow();
        const selectCell = row.insertCell();
        const checkbox = this.element<HTMLInputElement>('input'); checkbox.type = 'checkbox'; checkbox.checked = selected.has(String(record[component.key_field || 'id']));
        checkbox.addEventListener('change', () => {
          const key = String(record[component.key_field || 'id']);
          if (checkbox.checked) selected.add(key); else selected.delete(key);
          this.setBinding(component.select_binding, [...selected]);
        });
        selectCell.append(checkbox);
        for (const column of component.columns || []) { const cell = row.insertCell(); cell.textContent = String(record[column.field] ?? ''); }
      }
      if (!records.length) { const row = tableBody.insertRow(); const cell = row.insertCell(); cell.colSpan = (component.columns || []).length + 1; cell.textContent = 'No similar leads found.'; }
      body.append(table);
    }
    dialog.append(body);
    const footer = this.element('footer', 'odoo-dialog-footer');
    for (const action of component.actions || []) {
      const button = this.element<HTMLButtonElement>('button', `odoo-button${action.primary ? ' primary' : ''}`);
      button.type = 'button'; button.textContent = action.label;
      button.addEventListener('click', () => void this.trigger(action.event)); footer.append(button);
    }
    dialog.append(footer); container.append(dialog);
  }

  private renderFavorites(container: HTMLElement, component: Component) {
    container.classList.add('odoo-favorites');
    const store = new FavoritesStore(`core3:favorites:${component.storage_key || this.screen.id}`);
    const favorites = store.list();
    const select = this.element<HTMLSelectElement>('select', 'odoo-control-select');
    const empty = this.element<HTMLOptionElement>('option'); empty.value = ''; empty.textContent = component.label || 'Favorites'; select.append(empty);
    for (const favorite of favorites) {
      const option = this.element<HTMLOptionElement>('option'); option.value = favorite.id; option.textContent = favorite.label; select.append(option);
    }
    select.addEventListener('change', () => {
      const favorite = favorites.find(item => item.id === select.value);
      if (!favorite?.state) return;
      Object.assign(this.state, favorite.state); void this.trigger(component.apply_event);
    });
    const name = this.element<HTMLInputElement>('input', 'odoo-control-input');
    name.placeholder = component.placeholder || 'Save current search';
    name.value = String(this.resolve(component.name_binding) ?? '');
    name.addEventListener('input', () => this.setBinding(component.name_binding, name.value));
    const save = this.element<HTMLButtonElement>('button', 'odoo-button'); save.type = 'button'; save.textContent = component.save_label || 'Save';
    save.addEventListener('click', () => {
      const label = String(this.resolve(component.name_binding) || '').trim();
      if (!label) return;
      const state = Object.fromEntries((component.state_fields || []).map((field: string) => [field, this.state[field]]));
      store.save({ label, state }); this.setBinding(component.name_binding, ''); this.render();
    });
    const remove = this.element<HTMLButtonElement>('button', 'odoo-button'); remove.type = 'button'; remove.textContent = component.remove_label || 'Remove';
    remove.disabled = !favorites.length;
    remove.addEventListener('click', () => { if (select.value) { store.remove(select.value); this.render(); } });
    container.append(select, name, save, remove);
  }

  private renderDomainBuilder(container: HTMLElement, component: Component) {
    container.classList.add('odoo-domain-builder');
    const field = this.element<HTMLSelectElement>('select', 'odoo-control-select');
    for (const optionDefinition of component.fields || []) {
      const option = this.element<HTMLOptionElement>('option'); option.value = optionDefinition.value; option.textContent = optionDefinition.label; field.append(option);
    }
    field.value = String(this.resolve(component.field_binding) || component.fields?.[0]?.value || '');
    field.addEventListener('change', () => this.setBinding(component.field_binding, field.value));
    const operator = this.element<HTMLSelectElement>('select', 'odoo-control-select');
    for (const optionDefinition of component.operators || []) {
      const option = this.element<HTMLOptionElement>('option'); option.value = optionDefinition.value; option.textContent = optionDefinition.label; operator.append(option);
    }
    operator.value = String(this.resolve(component.operator_binding) || component.operators?.[0]?.value || 'eq');
    operator.addEventListener('change', () => this.setBinding(component.operator_binding, operator.value));
    const value = this.element<HTMLInputElement>('input', 'odoo-control-input'); value.placeholder = component.value_placeholder || 'Value';
    value.value = String(this.resolve(component.value_binding) || '');
    value.addEventListener('input', () => this.setBinding(component.value_binding, value.value));
    const add = this.element<HTMLButtonElement>('button', 'odoo-button'); add.type = 'button'; add.textContent = component.add_label || 'Add filter';
    add.addEventListener('click', () => void this.trigger(component.add_event));
    container.append(field, operator, value, add);
    const chips = this.element('div', 'odoo-domain-chips');
    for (const [index, filter] of (this.resolve(component.filters_binding) || []).entries()) {
      const chip = this.element('span', 'odoo-domain-chip'); chip.textContent = `${filter.field} ${filter.operator} ${filter.value}`;
      const remove = this.element<HTMLButtonElement>('button'); remove.type = 'button'; remove.textContent = '×'; remove.title = 'Remove filter';
      remove.addEventListener('click', () => {
        const filters = [...(this.resolve(component.filters_binding) || [])]; filters.splice(index, 1); this.setBinding(component.filters_binding, filters); void this.trigger(component.apply_event);
      });
      chip.append(remove); chips.append(chip);
    }
    if ((this.resolve(component.filters_binding) || []).length) {
      const clear = this.element<HTMLButtonElement>('button', 'odoo-button filter'); clear.type = 'button'; clear.textContent = component.clear_label || 'Clear filters';
      clear.addEventListener('click', () => { this.setBinding(component.filters_binding, []); void this.trigger(component.apply_event); }); chips.append(clear);
    }
    container.append(chips);
  }

  private renderNavigation(nav: HTMLElement, component: Component) {
    for (const item of component.items || []) {
      const link = this.element<HTMLAnchorElement>('a');
      link.href = item.to;
      link.textContent = item.label;
      if (location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(`${item.to}/`))) link.className = 'active';
      link.addEventListener('click', event => { event.preventDefault(); this.navigate(item.to); });
      nav.append(link);
    }
  }

  private renderKanban(board: HTMLElement, component: Component) {
    const rows = this.resolve(component.rows) || [];
    const groups = this.resolve(component.groups) || [...new Set(rows.map((row: any) => row[component.group_field]))];
    board.classList.add('yaml-kanban');
    for (const configuredGroup of groups) {
      const group = typeof configuredGroup === 'object' ? configuredGroup[component.group_value || 'id'] : configuredGroup;
      const column = this.element('section', 'yaml-kanban-column');
      const title = this.element('h2');
      title.textContent = typeof configuredGroup === 'object' ? configuredGroup[component.group_label || 'name'] : component.group_labels?.[group] || String(group);
      column.append(title);
      for (const row of rows.filter((item: any) => item[component.group_field] === group)) {
        const card = this.element('article', 'yaml-kanban-card odoo-kanban-card');
        card.tabIndex = 0;
        const top = this.element('div', 'odoo-kanban-card-top');
        const titleText = this.element('strong'); titleText.textContent = String(row[component.title_field] ?? ''); top.append(titleText);
        if (row.priority !== undefined) {
          const priority = this.element('span', 'odoo-priority');
          const level = Math.max(0, Math.min(3, Number(row.priority) || 0)); priority.textContent = level ? '★'.repeat(level) : '☆'; top.append(priority);
        }
        card.append(top);
        const fields = component.card_fields || (component.detail_fields || []).map((field: string) => ({ field }));
        for (const definition of fields) {
          const value = row[definition.field]; if (value === undefined || value === null || value === '') continue;
          const line = this.element('div', 'odoo-kanban-field');
          if (definition.label) { const label = this.element('span'); label.textContent = `${definition.label}: `; line.append(label); }
          const text = this.element('strong'); text.textContent = String(value); line.append(text); card.append(line);
        }
        if (row.next_activity) { const activity = this.element('div', 'odoo-kanban-activity'); activity.textContent = `Next activity: ${row.next_activity}`; card.append(activity); }
        const actions = component.card_actions || [];
        if (actions.length) {
          const actionBar = this.element('div', 'odoo-kanban-actions');
          for (const action of actions) {
            const button = this.element<HTMLButtonElement>('button', 'odoo-kanban-action'); button.type = 'button'; button.textContent = action.label;
            button.addEventListener('click', event => { event.stopPropagation(); void this.trigger(action.event, { row }); }); actionBar.append(button);
          }
          card.append(actionBar);
        }
        const open = () => void this.trigger(component.row_event, { row });
        card.addEventListener('click', open); card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
        column.append(card);
      }
      board.append(column);
    }
  }

  private renderChart(chart: HTMLElement, component: Component) {
    const rows = this.resolve(component.rows) || [];
    const max = Math.max(...rows.map((row: any) => Number(row[component.value_field] || 0)), 1);
    chart.classList.add('yaml-chart');
    for (const row of rows) {
      const item = this.element('div', 'yaml-chart-row');
      const label = this.element('span'); label.textContent = String(row[component.label_field] ?? '');
      const bar = this.element('div', 'yaml-chart-bar');
      const fill = this.element('i'); fill.style.width = `${Math.max(0, Number(row[component.value_field] || 0)) / max * 100}%`;
      const value = this.element('strong'); value.textContent = String(row[component.value_field] ?? 0);
      bar.append(fill); item.append(label, bar, value); chart.append(item);
    }
  }

  private renderPivot(container: HTMLElement, component: Component) {
    const rows = this.resolve(component.rows) || [];
    const columns = [...new Set(rows.map((row: any) => String(row[component.column_field] ?? ''))) ] as string[];
    const groups = new Map<string, Record<string, number>>();
    for (const row of rows) {
      const label = String(row[component.row_field] ?? '');
      const values = groups.get(label) || {};
      const column = String(row[component.column_field] ?? '');
      values[column] = (values[column] || 0) + Number(row[component.value_field] || 0);
      groups.set(label, values);
    }
    const table = this.element<HTMLTableElement>('table', 'yaml-table');
    const header = table.createTHead().insertRow();
    header.insertCell().textContent = component.row_label || component.row_field;
    for (const column of columns) header.insertCell().textContent = column;
    const body = table.createTBody();
    for (const [label, values] of groups) {
      const line = body.insertRow();
      line.insertCell().textContent = label;
      for (const column of columns) line.insertCell().textContent = String(values[column] || 0);
    }
    container.append(table);
  }

  private renderCalendar(container: HTMLElement, component: Component) {
    const rows = [...(this.resolve(component.rows) || [])].sort((left: any, right: any) => String(left[component.date_field] || '').localeCompare(String(right[component.date_field] || '')));
    container.classList.add('yaml-calendar');
    for (const row of rows) {
      const item = this.element('article', 'yaml-calendar-item');
      item.textContent = `${String(row[component.date_field] || 'No date')} — ${String(row[component.title_field] || '')}`;
      if (component.row_event) item.addEventListener('click', () => void this.trigger(component.row_event, { row }));
      container.append(item);
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
    try { await this.run(source, event); this.render(); }
    catch (error) { this.error = error instanceof Error ? error.message : 'Action failed.'; this.render(); }
  }

  private showFatal(message: string) { this.root.textContent = message; }
  private async fetchJson(path: string) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Unable to load ${path}`);
    return response.json();
  }
}

const root = document.querySelector('#app');
if (!root) throw new Error('Missing application root');
void new YamlScreenEngine(root as HTMLElement).start();
