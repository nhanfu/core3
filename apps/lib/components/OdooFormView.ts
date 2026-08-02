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

  constructor(id: string, state: any = {}, def: any = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container: HTMLElement) {
    const record = this.state.record || {};
    const messages = Array.isArray(this.state.messages) ? this.state.messages : [];
    const followers = Array.isArray(this.state.followers) ? this.state.followers : [];
    const attachments = Array.isArray(this.state.attachments) ? this.state.attachments : [];
    const root = html.take(container).section.className('o-form-view').getContext();
    const headerActions = Array.isArray(this.def.header_actions) ? this.def.header_actions : [];
    if (headerActions.length) {
      const actionBar = html.take(root).div.className('o-form-actionbar').getContext();
      for (const action of headerActions) {
        const button = html.take(actionBar).button
          .className(`o-form-action o-form-action-${action.variant || 'secondary'}`)
          .attr('type', 'button')
          .text(String(action.label || action.id || 'Action'))
          .getContext();
        button.addEventListener('click', () => void this.submit(String(action.id), { ...record }));
      }
    }
    const layout = html.take(root).div.className('o-form-layout').getContext();
    const sheet = html.take(layout).div.className('o-form-sheet').getContext();
    const header = html.take(sheet).header.className('o-form-header').getContext();
    const identity = html.take(header).div.className('o-form-identity').getContext();
    html.take(identity).h1.className('o-form-title').text(String(record[this.def.title_field] || '—'));
    if (this.def.subtitle_field && record[this.def.subtitle_field]) {
      html.take(identity).p.className('o-form-subtitle').text(String(record[this.def.subtitle_field]));
    }
    if (this.def.status_field) {
      const status = String(record[this.def.status_field] || '—');
      const label = String(record[this.def.status_label_field || this.def.status_field] || status);
      const tone = this.def.status_colors?.[label] || this.def.status_colors?.[status] || 'neutral';
      if (Array.isArray(this.def.statusbar) && this.def.statusbar.length) {
        const statusbar = html.take(sheet).nav.className('o-form-statusbar').attr('aria-label', 'Workflow status').getContext();
        for (const stage of this.def.statusbar) {
          const stageValue = String(stage.value ?? stage.id ?? stage.label ?? '');
          const stageLabel = String(stage.label ?? stageValue);
          const item = html.take(statusbar).span.className(`o-form-statusbar-step${stageValue === status ? ' is-current' : ''}`).getContext();
          item.textContent = stageLabel;
        }
      } else {
        html.take(header).span.className(`o-form-status data-grid-status data-grid-status-${tone}`).text(label);
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
      value.textContent = record[field.field] == null || record[field.field] === ''
        ? '—'
        : String(record[field.field]);
      }
    };
    if (Array.isArray(this.def.groups) && this.def.groups.length) {
      for (const group of this.def.groups) renderFields(group.fields || [], group.title);
    } else {
      renderFields(this.def.fields || []);
    }

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
}
