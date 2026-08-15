import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { OdooChatter } from './OdooChatter.ts';
import { showMessageDialog } from '@core3/client/components/Dialog';

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
    const editing = this.state.editing === true && this.def.editable !== false;
    const draft = editing ? { ...sourceRecord, ...(this.state.draft || {}) } : sourceRecord;
    const record = draft;
    const root = html.take(container).section.className('o-form-view').getContext();
    const headerActions = Array.isArray(this.def.header_actions) ? this.def.header_actions : [];
    const status = this.def.status_field ? String(record[this.def.status_field] || '—') : '';
    const statusLabel = this.def.status_field
      ? String(record[this.def.status_label_field || this.def.status_field] || status)
      : '';
    const statusStages = Array.isArray(this.def.statusbar) ? this.def.statusbar : [];
    const statusBadge = (this.def.status_badges || []).find((badge: any) => String(badge.value) === status);
    const layout = html.take(root).div.className('o-form-layout').getContext();
    const sheetBackground = html.take(layout).div.className('o-form-sheet-bg').getContext();

    if (headerActions.length || editing || statusStages.length) {
      const statusbar = html.take(sheetBackground).header.className('o-form-statusbar').getContext();
      const actionBar = html.take(statusbar).div.className('o-form-actionbar').getContext();
      for (const action of headerActions.filter((candidate: any) => !editing || candidate.id !== this.def.edit_action_id)) {
        const button = html.take(actionBar).button
          .className(`o-form-action o-form-action-${action.variant || 'secondary'}`)
          .attr('type', 'button')
          .text(String(action.label || action.id || 'Action'))
          .getContext();
        html.take(button).event('click', () => {
          if (action.id === this.def.edit_action_id && this.def.editable !== false) this.setState({ editing: true, draft: { ...sourceRecord } });
          else void this.submit(String(action.id), { ...record });
        });
      }
      if (editing) {
        const save = html.take(actionBar).button.className('o-form-action o-form-action-primary').attr('type', 'button').text('Save').getContext() as HTMLButtonElement;
        const discard = html.take(actionBar).button.className('o-form-action o-form-action-secondary').attr('type', 'button').text('Discard').getContext();
        html.take(save).event('click', async () => {
          html.take(save).prop('disabled', true);
          try {
            await this.state.onInlineSave?.({ ...sourceRecord, ...(this.state.draft || {}), id: sourceRecord.id });
            this.setState({ editing: false, draft: {} });
          } catch (error: any) {
            await showMessageDialog({ title: 'Unable to save', message: error instanceof Error ? error.message : 'Unable to save the order', confirmLabel: 'OK' });
          } finally {
            html.take(save).prop('disabled', false);
          }
        });
        html.take(discard).event('click', () => this.setState({ editing: false, draft: {} }));
      }
      if (statusStages.length) {
        const steps = html.take(statusbar).nav.className('o-form-statusbar-steps').attr('aria-label', 'Workflow status').getContext();
        for (const stage of statusStages) {
          const stageValue = String(stage.value ?? stage.id ?? stage.label ?? '');
          const stageLabel = String(stage.label ?? stageValue);
          const item = html.take(steps).span.className(`o-form-statusbar-step${stageValue === status ? ' is-current' : ''}`).getContext();
          html.take(item).replaceText(stageLabel);
          if (stageValue === status) html.take(item).attr('aria-current', 'step');
        }
      }
    }

    const sheet = html.take(sheetBackground).div.className('o-form-sheet').getContext();
    const header = html.take(sheet).header.className('o-form-header').getContext();
    const identity = html.take(header).div.className('o-form-identity').getContext();
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
        ? html.take(target).section.className(`o-form-field-group${wide ? ' o-form-field-group-wide' : ''}`).getContext()
        : target;
      if (title) html.take(group).h2.className('o-form-group-title').text(title);
      const fields = html.take(group).div.className('o-form-fields').getContext();
      for (const field of fieldsDef || []) {
      const item = html.take(fields).div.className(`o-form-field${field.wide || field.type === 'textarea' ? ' o-form-field-wide' : ''}`).getContext();
      html.take(item).div.className('o-form-field-label').text(String(field.label || ''));
      const value = html.take(item).div.className(`o-form-field-value${field.type === 'money' ? ' is-money' : ''}`).getContext();
      if (!editing) {
        html.take(value).replaceText(record[field.field] == null || record[field.field] === '' ? '—' : String(record[field.field]));
        continue;
      }
      const current = record[field.field] ?? '';
      let editor: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (field.type === 'textarea' || field.type === 'richtext') {
        editor = html.take(value).textarea.getContext() as HTMLTextAreaElement;
        html.take(editor).prop('rows', 3);
      } else if (field.type === 'select' || field.type === 'multi-select') {
        editor = html.take(value).select.getContext() as HTMLSelectElement;
        for (const option of field.options || []) {
          const itemOption = typeof option === 'string' ? { id: option, label: option } : option;
          const optionValue = String(itemOption.id ?? itemOption.value ?? '');
          html.take(editor).option.prop('value', optionValue).text(String(itemOption.label ?? optionValue));
        }
      } else {
        editor = html.take(value).input.getContext() as HTMLInputElement;
        html.take(editor).type(field.type === 'number' || field.type === 'money' ? 'number' : 'text');
        if (field.type === 'date' || field.type === 'time' || field.type === 'datetime') {
          html.take(editor).prop('inputMode', 'numeric');
          html.take(editor).prop('placeholder', field.type === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm');
        }
      }
      html.take(editor).className('o-form-inline-editor').prop('value', Array.isArray(current) ? current.join(',') : String(current));
      editor.dataset.formField = field.field;
      html.take(editor).event('input', () => { this.state.draft = { ...(this.state.draft || {}), [field.field]: editor.value }; });
      }
    };
    if (editing && Array.isArray(this.def.edit_fields)) {
      renderFields(this.def.edit_fields, 'Edit details');
    } else if (Array.isArray(this.def.groups) && this.def.groups.length) {
      if (this.def.group_columns) {
        const groups = html.take(sheet).div.className(`o-form-groups o-form-groups-${this.def.group_columns}`).getContext();
        for (const group of this.def.groups) renderFields(group.fields || [], group.title, groups, group.wide === true);
      } else {
        for (const group of this.def.groups) renderFields(group.fields || [], group.title);
      }
    } else {
      renderFields(this.def.fields || []);
    }

    const notebookTabs = Array.isArray(this.def.notebook?.tabs) ? this.def.notebook.tabs : [];
    if (!editing && notebookTabs.length) {
      const notebook = html.take(sheet).section.className('o-form-notebook').getContext();
      const tablist = html.take(notebook).div.className('o-form-notebook-tabs').attr('role', 'tablist').getContext();
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
        const button = html.take(tablist).button.className(`o-form-notebook-tab${id === activeTab ? ' is-active' : ''}`).attr('type', 'button').attr('role', 'tab').getContext() as HTMLButtonElement;
        html.take(button).replaceText(String(tab.label || id));
        button.dataset.notebookTab = id;
        html.take(button).prop('id', `${panelId}-tab`);
        html.take(button).attr('aria-controls', panelId).attr('aria-selected', String(id === activeTab));
        buttons.push(button);
        const panel = html.take(notebook).div.className(`o-form-notebook-panel${tab.content_slot ? ' o-form-notebook-panel-slot' : ''}`).attr('role', 'tabpanel').getContext();
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
    const chatterSlot = html.take(layout).div.className('o-form-chatter-slot').getContext() as HTMLDivElement;
    chatter.mount(chatterSlot);
  }

  getEmbeddedContent() {
    if (!this.embeddedContent) {
      this.embeddedContent = html.take(null).div.getContext() as HTMLDivElement;
      html.take(this.embeddedContent).className('o-form-embedded-content');
    }
    return this.embeddedContent;
  }
}
