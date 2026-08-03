import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';
import { appendIcon } from './Icon.ts';

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
    const sourceRecord = this.state.record || {};
    const editing = this.state.editing === true && this.def.editable !== false;
    const draft = editing ? { ...sourceRecord, ...(this.state.draft || {}) } : sourceRecord;
    const record = draft;
    const messages = Array.isArray(this.state.messages) ? this.state.messages : [];
    const followers = Array.isArray(this.state.followers) ? this.state.followers : [];
    const attachments = Array.isArray(this.state.attachments) ? this.state.attachments : [];
    const root = html.take(container).section.className('o-form-view').getContext();
    const headerActions = Array.isArray(this.def.header_actions) ? this.def.header_actions : [];
    const status = this.def.status_field ? String(record[this.def.status_field] || '—') : '';
    const statusLabel = this.def.status_field
      ? String(record[this.def.status_label_field || this.def.status_field] || status)
      : '';
    const statusStages = Array.isArray(this.def.statusbar) ? this.def.statusbar : [];
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
        button.addEventListener('click', () => {
          if (action.id === this.def.edit_action_id && this.def.editable !== false) this.setState({ editing: true, draft: { ...sourceRecord } });
          else void this.submit(String(action.id), { ...record });
        });
      }
      if (editing) {
        const save = html.take(actionBar).button.className('o-form-action o-form-action-primary').attr('type', 'button').text('Save').getContext() as HTMLButtonElement;
        const discard = html.take(actionBar).button.className('o-form-action o-form-action-secondary').attr('type', 'button').text('Discard').getContext();
        save.addEventListener('click', async () => {
          save.disabled = true;
          try {
            await this.state.onInlineSave?.({ ...sourceRecord, ...(this.state.draft || {}), id: sourceRecord.id });
            this.setState({ editing: false, draft: {} });
          } finally {
            save.disabled = false;
          }
        });
        discard.addEventListener('click', () => this.setState({ editing: false, draft: {} }));
      }
      if (statusStages.length) {
        const steps = html.take(statusbar).nav.className('o-form-statusbar-steps').attr('aria-label', 'Workflow status').getContext();
        for (const stage of statusStages) {
          const stageValue = String(stage.value ?? stage.id ?? stage.label ?? '');
          const stageLabel = String(stage.label ?? stageValue);
          const item = html.take(steps).span.className(`o-form-statusbar-step${stageValue === status ? ' is-current' : ''}`).getContext();
          item.textContent = stageLabel;
          if (stageValue === status) item.setAttribute('aria-current', 'step');
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
      if (!statusStages.length) {
        html.take(header).span.className(`o-form-status data-grid-status data-grid-status-${tone}`).text(statusLabel);
      }
    }

    const renderFields = (fieldsDef: any[], title?: string) => {
      const group = title ? html.take(sheet).section.className('o-form-field-group').getContext() : sheet;
      if (title) html.take(group).h2.className('o-form-group-title').text(title);
      const fields = html.take(group).div.className('o-form-fields').getContext();
      for (const field of fieldsDef || []) {
      const item = html.take(fields).div.className(`o-form-field${field.wide || field.type === 'textarea' ? ' o-form-field-wide' : ''}`).getContext();
      html.take(item).div.className('o-form-field-label').text(String(field.label || ''));
      const value = html.take(item).div.className(`o-form-field-value${field.type === 'money' ? ' is-money' : ''}`).getContext();
      if (!editing) {
        value.textContent = record[field.field] == null || record[field.field] === '' ? '—' : String(record[field.field]);
        continue;
      }
      const current = record[field.field] ?? '';
      let editor: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (field.type === 'textarea' || field.type === 'richtext') {
        editor = document.createElement('textarea');
        editor.rows = 3;
      } else if (field.type === 'select' || field.type === 'multi-select') {
        editor = document.createElement('select');
        for (const option of field.options || []) {
          const itemOption = typeof option === 'string' ? { id: option, label: option } : option;
          const optionEl = document.createElement('option');
          optionEl.value = String(itemOption.id ?? itemOption.value ?? '');
          optionEl.textContent = String(itemOption.label ?? optionEl.value);
          editor.appendChild(optionEl);
        }
      } else {
        editor = document.createElement('input');
        editor.type = field.type === 'number' || field.type === 'money' ? 'number' : ['date', 'time'].includes(field.type) ? field.type : 'text';
      }
      editor.className = 'o-form-inline-editor';
      editor.value = Array.isArray(current) ? current.join(',') : String(current);
      editor.dataset.formField = field.field;
      editor.addEventListener('input', () => { this.state.draft = { ...(this.state.draft || {}), [field.field]: editor.value }; });
      value.appendChild(editor);
      }
    };
    if (editing && Array.isArray(this.def.edit_fields)) {
      renderFields(this.def.edit_fields, 'Edit details');
    } else if (Array.isArray(this.def.groups) && this.def.groups.length) {
      for (const group of this.def.groups) renderFields(group.fields || [], group.title);
    } else {
      renderFields(this.def.fields || []);
    }

    if (this.def.content_slot) sheet.appendChild(this.getEmbeddedContent());

    if (!this.def.message_source && !this.def.follower_source && !this.def.attachment_source) return;
    const chatter = document.createElement('aside');
    chatter.className = 'o-form-chatter';
    chatter.setAttribute('aria-label', String(this.def.chatter_label || 'Chatter'));
    layout.appendChild(chatter);

    const topbar = document.createElement('div');
    topbar.className = 'o-form-chatter-topbar';
    const chatterActions = [
      [this.def.message_label || 'Send message', this.def.message_action, 'message'],
      [this.def.note_label || 'Log note', this.def.note_action, 'note'],
    ].filter(([, action]) => Boolean(action));
    for (const [label, action, mode] of chatterActions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = label === (this.def.message_label || 'Send message') ? 'o-form-chatter-primary' : 'o-form-chatter-secondary';
      button.textContent = String(label);
      button.addEventListener('click', () => {
          const current = chatter.querySelector('.o-form-composer');
          if (current) current.remove();
          const composer = document.createElement('form');
          composer.className = 'o-form-composer';
          const input = document.createElement('textarea');
          input.placeholder = String(mode === 'message' ? this.def.message_placeholder || 'Write a message…' : this.def.note_placeholder || 'Log an internal note…');
          input.required = true;
          const submit = document.createElement('button');
          submit.type = 'submit';
          submit.className = 'o-form-composer-submit';
          submit.textContent = String(mode === 'message' ? this.def.send_label || 'Send' : this.def.log_label || 'Log note');
          composer.append(input, submit);
          composer.addEventListener('submit', event => {
            event.preventDefault();
            const content = input.value.trim();
            if (!content) return;
            submit.disabled = true;
            void Promise.resolve(this.submit(String(action), { id: record.id, content })).finally(() => { submit.disabled = false; });
          });
          topbar.insertAdjacentElement('afterend', composer);
          input.focus();
      });
      topbar.appendChild(button);
    }
    const tools = document.createElement('div');
    tools.className = 'o-form-chatter-tools';
    if (this.def.attachment_source) {
      const attachmentTool = document.createElement('span');
      attachmentTool.className = 'o-form-chatter-tool';
      appendIcon(attachmentTool, 'file');
      attachmentTool.append(document.createTextNode(String(attachments.length)));
      attachmentTool.title = `${attachments.length} attachments`;
      tools.appendChild(attachmentTool);
    }
    if (this.def.follower_source) {
      const followerTool = document.createElement('span');
      followerTool.className = 'o-form-chatter-tool';
      appendIcon(followerTool, 'users');
      followerTool.append(document.createTextNode(String(followers.length)));
      followerTool.title = `${followers.length} followers`;
      tools.appendChild(followerTool);
    }
    if (tools.childElementCount) topbar.appendChild(tools);
    chatter.appendChild(topbar);

    const sections = [
      this.def.follower_source ? { title: this.def.follower_label || 'Followers', rows: followers, label: (row: any) => row.name || row.actor_name || row.created_by } : null,
      this.def.attachment_source ? { title: this.def.attachment_label || 'Attachments', rows: attachments, label: (row: any) => row.file_name || row.name } : null,
    ].filter(Boolean) as any[];
    for (const section of sections) {
      const panel = document.createElement('section');
      panel.className = 'o-form-chatter-section';
      const heading = document.createElement('h2');
      heading.textContent = String(section.title);
      panel.appendChild(heading);
      if (!section.rows.length) {
        const empty = document.createElement('p');
        empty.className = 'o-form-chatter-empty';
        empty.textContent = `No ${String(section.title).toLocaleLowerCase()}`;
        panel.appendChild(empty);
      } else {
        const list = document.createElement('ul');
        for (const row of section.rows) {
          const item = document.createElement('li');
          item.textContent = String(section.label(row) || '—');
          list.appendChild(item);
        }
        panel.appendChild(list);
      }
      chatter.appendChild(panel);
    }

    const stream = document.createElement('section');
    stream.className = 'o-form-chatter-stream';
    const streamHeading = document.createElement('h2');
    streamHeading.textContent = String(this.def.chatter_label || 'Messages and activities');
    stream.appendChild(streamHeading);
    if (!messages.length) {
      const empty = document.createElement('p');
      empty.className = 'o-form-chatter-empty';
      empty.textContent = 'No messages or activities yet';
      stream.appendChild(empty);
    }
    for (const message of messages) {
      const entry = document.createElement('article');
      entry.className = 'o-form-chatter-message';
      const meta = document.createElement('div');
      meta.className = 'o-form-chatter-message-meta';
      meta.textContent = [message[this.def.message_actor_field || 'actor_name'], message[this.def.message_timestamp_field || 'created_at']]
        .filter(Boolean).join(' · ');
      const body = document.createElement('p');
      body.textContent = String(message[this.def.message_action_field || 'action_label'] || message.action || 'Activity');
      const detail = document.createElement('span');
      detail.textContent = String(message[this.def.message_detail_field || 'detail'] || '');
      entry.append(meta, body, detail);
      stream.appendChild(entry);
    }
    chatter.appendChild(stream);
  }

  getEmbeddedContent() {
    if (!this.embeddedContent) {
      this.embeddedContent = document.createElement('div');
      this.embeddedContent.className = 'o-form-embedded-content';
    }
    return this.embeddedContent;
  }
}
