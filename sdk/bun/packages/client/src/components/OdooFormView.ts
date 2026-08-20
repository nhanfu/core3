import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { OdooChatter } from './OdooChatter.ts';
import { showToast, toastTypeForError } from '@core3/client/components/Toast';
import { AsyncSelect } from '@core3/client/components/AsyncSelect';

/**
 * Read-only form sheet for back-office record pages.  It deliberately only
 * owns record identity, field layout, and the optional aside chatter. Related
 * data remains YAML-owned sources, matching Odoo's form sheet + chatter split.
 */
export class OdooFormView extends BaseComponent {
  def: any;
  private embeddedContent: HTMLElement | null = null;

  constructor(id: string, state: any = {}, def: any = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container: HTMLElement) {
    for (const child of this.children) child.dispose();
    this.children = [];
    const sourceRecord = this.state.record || {};
    const labels = {
      save: 'Save',
      discard: 'Discard',
      editDetails: 'Edit details',
      workflowStatus: 'Workflow status',
      ...this.def.labels,
    };
    const editing = this.state.editing === true && this.def.editable !== false;
    const draft = editing ? { ...sourceRecord, ...(this.state.draft || {}) } : sourceRecord;
    const record = draft;
    const root = html.take(container).section.className('o-form-view').ele();
    const headerActions = Array.isArray(this.def.header_actions) ? this.def.header_actions : [];
    const status = this.def.status_field ? String(record[this.def.status_field] || '—') : '';
    const statusLabel = this.def.status_field
      ? String(record[this.def.status_label_field || this.def.status_field] || status)
      : '';
    const statusStages = Array.isArray(this.def.statusbar) ? this.def.statusbar : [];
    const statusBadge = (this.def.status_badges || []).find((badge: any) => String(badge.value) === status);
    const layout = html.take(root).div.className('o-form-layout').ele();
    const sheetBackground = html.take(layout).div.className('o-form-sheet-bg').ele();

    if (headerActions.length || editing || statusStages.length) {
      const statusbar = html.take(sheetBackground).header.className('o-form-statusbar').ele();
      const actionBar = html.take(statusbar).div.className('o-form-actionbar').ele();
      for (const action of headerActions.filter((candidate: any) => !editing || candidate.id !== this.def.edit_action_id)) {
        const button = html.take(actionBar).button
          .className(`o-form-action o-form-action-${action.variant || 'secondary'}`)
          .attr('type', 'button')
          .text(String(action.label || action.id || 'Action'))
          .ele();
        html.take(button).event('click', () => {
          if (action.id === this.def.edit_action_id && this.def.editable !== false) this.setState({ editing: true, draft: { ...sourceRecord } });
          else void this.submit(String(action.id), { ...record });
        });
      }
      if (editing) {
        const save = html.take(actionBar).button.className('o-form-action o-form-action-primary').attr('type', 'button').text(labels.save).ele() as HTMLButtonElement;
        const discard = html.take(actionBar).button.className('o-form-action o-form-action-secondary').attr('type', 'button').text(labels.discard).ele();
        html.take(save).event('click', async () => {
          html.take(save).prop('disabled', true);
          try {
            await this.state.onInlineSave?.({ ...sourceRecord, ...(this.state.draft || {}), id: sourceRecord.id });
            this.setState({ editing: false, draft: {} });
          } catch (error: any) {
            showToast(error instanceof Error ? error.message : 'Unable to save the order', toastTypeForError(error));
          } finally {
            html.take(save).prop('disabled', false);
          }
        });
        html.take(discard).event('click', () => this.setState({ editing: false, draft: {} }));
      }
      if (statusStages.length) {
        const steps = html.take(statusbar).nav.className('o-form-statusbar-steps').attr('aria-label', labels.workflowStatus).ele();
        for (const stage of statusStages) {
          const stageValue = String(stage.value ?? stage.id ?? stage.label ?? '');
          const stageLabel = String(stage.label ?? stageValue);
          const item = html.take(steps).span.className(`o-form-statusbar-step${stageValue === status ? ' is-current' : ''}`).ele();
          html.take(item).replaceText(stageLabel);
          if (stageValue === status) html.take(item).attr('aria-current', 'step');
        }
      }
    }

    const sheet = html.take(sheetBackground).div.className('o-form-sheet').ele();
    const header = html.take(sheet).header.className('o-form-header').ele();
    const identity = html.take(header).div.className('o-form-identity').ele();
    html.take(identity).h1.className('o-form-title').text(String(record[this.def.title_field] || '—'));
    if (this.def.subtitle_field && record[this.def.subtitle_field]) {
      html.take(identity).p.className('o-form-subtitle').text(String(record[this.def.subtitle_field]));
    }
    if (this.def.status_field) {
      const tone = this.def.status_colors?.[statusLabel] || this.def.status_colors?.[status] || 'neutral';
      if (statusBadge) {
        html.take(header).span
          .className(`o-form-status o-form-status-exception data-grid-status data-grid-status-${statusBadge.tone || tone}`)
          .text(String(statusBadge.label || statusLabel));
      } else if (!statusStages.length) {
        html.take(header).span.className(`o-form-status data-grid-status data-grid-status-${tone}`).text(statusLabel);
      }
    }

    const renderFields = (fieldsDef: any[], title?: string, target: HTMLElement = sheet, wide = false) => {
      const group = title
        ? html.take(target).section.className(`o-form-field-group${wide ? ' o-form-field-group-wide' : ''}`).ele()
        : target;
      if (title) html.take(group).h2.className('o-form-group-title').text(title);
      const fields = html.take(group).div.className('o-form-fields').ele();
      for (const field of fieldsDef || []) {
      const item = html.take(fields).div.className(`o-form-field${field.wide || field.type === 'textarea' ? ' o-form-field-wide' : ''}`).ele();
      html.take(item).div.className('o-form-field-label').text(String(field.label || ''));
      const value = html.take(item).div.className(`o-form-field-value${field.type === 'money' ? ' is-money' : ''}`).ele();
      if (!editing) {
        if (field.type === 'permission-grid') {
          const selected = new Set(String(record[field.field] || '').split(',').map(permission => permission.trim()).filter(Boolean));
          const options = Array.isArray(this.def.permission_options) ? this.def.permission_options : [];
          const labelsByValue = new Map(options.map((option: any) => [String(option.value ?? option.permission_key ?? ''), String(option.label || option.value || '')]));
          const chips = html.take(value).div.className('o-permission-chips').ele();
          for (const permission of selected) {
            html.take(chips).span.className('o-permission-chip').text(labelsByValue.get(permission) || permission);
          }
          if (!selected.size) html.take(value).replaceText('—');
        } else {
          html.take(value).replaceText(record[field.field] == null || record[field.field] === '' ? '—' : String(record[field.field]));
        }
        continue;
      }
      const current = record[field.field] ?? '';
      let editor: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (field.type === 'permission-grid') {
        const selected = new Set(Array.isArray(current) ? current.map(String) : String(current || '').split(',').map(permission => permission.trim()).filter(Boolean));
        const options = Array.isArray(this.def.permission_options) ? this.def.permission_options : [];
        const hidden = html.take(value).input.type('hidden').ele() as HTMLInputElement;
        editor = hidden;
        const groups = new Map<string, HTMLElement>();
        for (const option of options) {
          const permission = String(option.value ?? option.permission_key ?? '');
          if (!permission) continue;
          const groupKey = String(option.group || permission.split('.')[0] || 'general');
          let grid = groups.get(groupKey);
          if (!grid) {
            const section = html.take(value).section.className('o-permission-grid-group').ele();
            html.take(section).h3.className('o-permission-grid-title').text(groupKey);
            grid = html.take(section).div.className('o-permission-grid').ele();
            groups.set(groupKey, grid);
          }
          const label = html.take(grid).label.className('o-permission-grid-item').ele();
          const checkbox = html.take(label).input.type('checkbox').ele() as HTMLInputElement;
          html.take(checkbox).prop('checked', selected.has(permission) || option.enabled === true);
          html.take(label).span.className('o-permission-grid-label').text(String(option.label || permission));
          html.take(checkbox).event('change', () => {
            if (checkbox.checked) selected.add(permission); else selected.delete(permission);
            const next = [...selected].sort();
            hidden.value = next.join(',');
            this.state.draft = { ...(this.state.draft || {}), [field.field]: next };
          });
        }
        hidden.value = [...selected].sort().join(',');
      } else if (field.type === 'textarea' || field.type === 'richtext') {
        editor = html.take(value).textarea.ele() as HTMLTextAreaElement;
        html.take(editor).prop('rows', 3);
      } else if (field.type === 'async-select' || field.type === 'multi-select') {
        const select = this.createChild(AsyncSelect, `inline-${field.field}`, {
          value: Array.isArray(current) ? current : String(current || '').split(',').map(value => value.trim()).filter(Boolean),
        });
        select.def.options = (field.options || []).map((option: any) => ({ value: option.value ?? option.id, label: option.label ?? option.name ?? option.value ?? option.id }));
        select.def.multiple = field.type === 'multi-select';
        select.def.placeholder = field.placeholder;
        select.mount(value);
        editor = select.input as HTMLInputElement;
      } else if (field.type === 'select') {
        editor = html.take(value).select.ele() as HTMLSelectElement;
        for (const option of field.options || []) {
          const itemOption = typeof option === 'string' ? { id: option, label: option } : option;
          const optionValue = String(itemOption.id ?? itemOption.value ?? '');
          html.take(editor).option.prop('value', optionValue).text(String(itemOption.label ?? optionValue));
        }
      } else if (field.type === 'checkbox') {
        editor = html.take(value).input.ele() as HTMLInputElement;
        html.take(editor).type('checkbox');
        (editor as HTMLInputElement).checked = Boolean(current);
      } else {
        editor = html.take(value).input.ele() as HTMLInputElement;
        html.take(editor).type(field.type === 'number' || field.type === 'money' ? 'number' : 'text');
        if (field.type === 'date' || field.type === 'time' || field.type === 'datetime') {
          html.take(editor).prop('inputMode', 'numeric');
          html.take(editor).prop('placeholder', field.type === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm');
        }
      }
      if (field.type !== 'permission-grid') html.take(editor).className('o-form-inline-editor').prop('value', Array.isArray(current) ? current.join(',') : String(current));
      editor.dataset.formField = field.field;
      const updateDraft = () => {
        this.state.draft = { ...(this.state.draft || {}), [field.field]: field.type === 'checkbox' ? (editor as HTMLInputElement).checked : field.type === 'multi-select' ? editor.value.split(',').filter(Boolean) : editor.value };
      };
      html.take(editor).event('input', updateDraft).event('change', updateDraft);
      }
    };
    if (editing && Array.isArray(this.def.edit_fields)) {
      renderFields(this.def.edit_fields, labels.editDetails);
    } else if (Array.isArray(this.def.groups) && this.def.groups.length) {
      if (this.def.group_columns) {
        const groups = html.take(sheet).div.className(`o-form-groups o-form-groups-${this.def.group_columns}`).ele();
        for (const group of this.def.groups) renderFields(group.fields || [], group.title, groups, group.wide === true);
      } else {
        for (const group of this.def.groups) renderFields(group.fields || [], group.title);
      }
    } else {
      renderFields(this.def.fields || []);
    }

    const notebookTabs = Array.isArray(this.def.notebook?.tabs) ? this.def.notebook.tabs : [];
    if (!editing && notebookTabs.length) {
      const notebook = html.take(sheet).section.className('o-form-notebook').ele();
      const tablist = html.take(notebook).div.className('o-form-notebook-tabs').attr('role', 'tablist').ele();
      const activeTab = String(this.state.activeNotebookTab || this.def.notebook.active || notebookTabs[0]?.id || '');
      const buttons: HTMLButtonElement[] = [];
      const panels: HTMLElement[] = [];
      const selectTab = (id: string) => {
        this.state.activeNotebookTab = id;
        buttons.forEach(button => {
          const selected = button.dataset.notebookTab === id;
          html.take(button).toggleClass('is-active', selected).attr('aria-selected', String(selected));
        });
        panels.forEach(panel => { html.take(panel).prop('hidden', panel.dataset.notebookPanel !== id); });
      };
      html.take(tablist).event('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        const eventButton = (event.target as HTMLElement).closest<HTMLButtonElement>('[role="tab"]');
        const current = buttons.indexOf(eventButton || document.activeElement as HTMLButtonElement);
        if (current < 0 || !buttons.length) return;
        const next = event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? buttons.length - 1
            : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
        const button = buttons[next];
        html.take(button).focus();
        selectTab(String(button.dataset.notebookTab));
        event.preventDefault();
      });
      for (const tab of notebookTabs) {
        const id = String(tab.id || tab.label || `tab-${buttons.length}`);
        const panelId = `${this.id}-notebook-${id}`;
        const button = html.take(tablist).button.className(`o-form-notebook-tab${id === activeTab ? ' is-active' : ''}`).attr('type', 'button').attr('role', 'tab').ele() as HTMLButtonElement;
        html.take(button).replaceText(String(tab.label || id));
        button.dataset.notebookTab = id;
        html.take(button).prop('id', `${panelId}-tab`);
        html.take(button).attr('aria-controls', panelId).attr('aria-selected', String(id === activeTab));
        buttons.push(button);
        const panel = html.take(notebook).div.className(`o-form-notebook-panel${tab.content_slot ? ' o-form-notebook-panel-slot' : ''}`).attr('role', 'tabpanel').ele();
        html.take(panel).prop('id', panelId);
        panel.dataset.notebookPanel = id;
        html.take(panel).attr('aria-labelledby', button.id).prop('hidden', id !== activeTab);
        panels.push(panel);
        if (tab.content_slot) {
          const embedded = this.getEmbeddedContent();
          if (!embedded.contains(panel)) html.take(panel).attach(embedded);
        }
        if (Array.isArray(tab.groups)) {
          for (const group of tab.groups) renderFields(group.fields || [], group.title, panel, group.wide === true);
        } else if (Array.isArray(tab.fields)) {
          renderFields(tab.fields, undefined, panel);
        }
        html.take(button).event('click', () => selectTab(id));
      }
    } else if (this.def.content_slot) {
      const embedded = this.getEmbeddedContent();
      if (!embedded.contains(sheet)) html.take(sheet).attach(embedded);
    }

    if (!this.def.message_source && !this.def.follower_source && !this.def.attachment_source) return;
    const chatter = new OdooChatter(`${this.id}-chatter`, {
      record,
      messages: this.state.messages || [],
      followers: this.state.followers || [],
      followerCandidates: this.state.followerCandidates || [],
      attachments: this.state.attachments || [],
    }, this.def);
    chatter.parent = this;
    this.children.push(chatter);
    const chatterSlot = html.take(layout).div.className('o-form-chatter-slot').ele() as HTMLDivElement;
    chatter.mount(chatterSlot);
  }

  getEmbeddedContent() {
    if (!this.embeddedContent) {
      this.embeddedContent = html.take(null).div.ele() as HTMLDivElement;
      html.take(this.embeddedContent).className('o-form-embedded-content');
    }
    return this.embeddedContent;
  }
}
