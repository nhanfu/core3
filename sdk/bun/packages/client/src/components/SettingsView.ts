import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';

type SettingField = {
  field?: string;
  label: string;
  description?: string;
  type?: 'checkbox' | 'select' | 'info';
  options?: Array<{ value: string; label: string }>;
  disabled?: boolean;
  action_label?: string;
};

type SettingsTab = {
  id: string;
  label: string;
  icon?: string;
  sections: Array<{ title?: string; fields: SettingField[] }>;
};

/** Odoo-style settings shell: vertical tabs, global save/discard, and two-column setting cards. */
export class SettingsView extends BaseComponent {
  static resolveState(definition: any, context: any) {
    const source = definition.source ? context.dataMap?.[definition.source]?.data : {};
    return { record: { ...(source || {}) }, draft: { ...(source || {}) }, activeTab: definition.tabs?.[0]?.id || '' };
  }

  constructor(id: string, state: any = {}, private readonly def: any = {}) {
    super(id, state);
  }

  draw(container: HTMLElement) {
    this.disposeChildren();
    const tabs = (this.def.tabs || []) as SettingsTab[];
    const root = document.createElement('section');
    root.className = 'o-settings-view';

    const toolbar = document.createElement('header');
    toolbar.className = 'o-settings-toolbar';
    const save = this.button(this.def.save_label || 'Save', 'primary');
    const discard = this.button(this.def.discard_label || 'Discard', 'secondary');
    const title = document.createElement('span');
    title.className = 'o-settings-toolbar-title';
    title.textContent = this.def.title || 'Settings';
    const search = document.createElement('input');
    search.className = 'o-settings-search';
    search.type = 'search';
    search.placeholder = this.def.search_placeholder || 'Search...';
    toolbar.append(save, discard, title, search);
    root.appendChild(toolbar);

    const body = document.createElement('div');
    body.className = 'o-settings-body';
    const navigation = document.createElement('nav');
    navigation.className = 'o-settings-nav';
    navigation.setAttribute('aria-label', 'Settings sections');
    const content = document.createElement('main');
    content.className = 'o-settings-content';
    body.append(navigation, content);
    root.appendChild(body);
    container.appendChild(root);

    const renderTab = (tab: SettingsTab) => {
      this.state.activeTab = tab.id;
      navigation.replaceChildren();
      for (const candidate of tabs) {
        const navButton = document.createElement('button');
        navButton.type = 'button';
        navButton.className = `o-settings-nav-item${candidate.id === tab.id ? ' is-active' : ''}`;
        if (candidate.icon) {
          const icon = document.createElement('span');
          icon.className = 'o-settings-nav-icon';
          appendIcon(icon, candidate.icon, candidate.label);
          navButton.appendChild(icon);
        }
        const navLabel = document.createElement('span');
        navLabel.className = 'o-settings-nav-label';
        navLabel.textContent = candidate.label;
        navButton.appendChild(navLabel);
        navButton.addEventListener('click', () => renderTab(candidate));
        navigation.appendChild(navButton);
      }

      content.replaceChildren();
      for (const section of tab.sections || []) {
        if (section.title) {
          const heading = document.createElement('h2');
          heading.className = 'o-settings-section-title';
          heading.textContent = section.title;
          content.appendChild(heading);
        }
        const grid = document.createElement('div');
        grid.className = 'o-settings-grid';
        for (const field of section.fields || []) grid.appendChild(this.renderField(field));
        content.appendChild(grid);
      }
    };

    save.addEventListener('click', async () => {
      save.disabled = true;
      discard.disabled = true;
      try {
        await this.submit(String(this.def.save_action || ''), { id: this.state.record.id, ...this.state.draft });
        this.state.record = { ...this.state.draft };
        save.textContent = 'Saved';
        window.setTimeout(() => { save.textContent = this.def.save_label || 'Save'; }, 1200);
      } catch (error: any) {
        save.textContent = error instanceof Error ? error.message : 'Unable to save';
        window.setTimeout(() => { save.textContent = this.def.save_label || 'Save'; }, 2500);
      } finally {
        save.disabled = false;
        discard.disabled = false;
      }
    });
    discard.addEventListener('click', () => {
      this.state.draft = { ...this.state.record };
      renderTab(tabs.find(tab => tab.id === this.state.activeTab) || tabs[0]);
    });
    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase();
      content.querySelectorAll<HTMLElement>('.o-settings-card').forEach(card => {
        card.hidden = Boolean(query && !card.textContent?.toLowerCase().includes(query));
      });
    });
    renderTab(tabs.find(tab => tab.id === this.state.activeTab) || tabs[0]);
  }

  private renderField(field: SettingField) {
    const card = document.createElement('article');
    card.className = 'o-settings-card';
    const control = document.createElement('div');
    control.className = 'o-settings-card-control';
    const content = document.createElement('div');
    content.className = 'o-settings-card-content';
    const label = document.createElement('h3');
    label.textContent = field.label;
    content.appendChild(label);
    if (field.description) {
      const description = document.createElement('p');
      description.textContent = field.description;
      content.appendChild(description);
    }
    if (field.action_label) {
      const action = document.createElement('a');
      action.href = '#';
      action.className = 'o-settings-card-action';
      action.textContent = `→ ${field.action_label}`;
      action.addEventListener('click', event => event.preventDefault());
      content.appendChild(action);
    }
    if (field.type === 'info' || !field.field) {
      card.append(control, content);
      return card;
    }
    if (field.type === 'select') {
      const select = document.createElement('select');
      select.className = 'o-settings-select';
      for (const option of field.options || []) {
        const item = document.createElement('option');
        item.value = option.value;
        item.textContent = option.label;
        select.appendChild(item);
      }
      select.value = String(this.state.draft[field.field] ?? '');
      select.disabled = field.disabled === true;
      select.addEventListener('change', () => { this.state.draft[field.field!] = select.value; });
      control.appendChild(select);
    } else {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'o-settings-checkbox';
      checkbox.checked = Boolean(this.state.draft[field.field]);
      checkbox.disabled = field.disabled === true;
      checkbox.addEventListener('change', () => { this.state.draft[field.field!] = checkbox.checked; });
      control.appendChild(checkbox);
    }
    card.append(control, content);
    return card;
  }

  private button(label: string, variant: 'primary' | 'secondary') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `o-settings-button o-settings-button-${variant}`;
    button.textContent = label;
    return button;
  }
}
