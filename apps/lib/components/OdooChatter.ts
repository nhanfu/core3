import { BaseComponent } from './BaseComponent.ts';
import { appendIcon } from './Icon.ts';

function initials(value: unknown) {
  const words = String(value || '?').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map(word => word[0]?.toUpperCase()).join('') || '?';
}

function formatTimestamp(value: unknown, locale?: string) {
  if (!value) return '';
  const normalized = String(value).trim().replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1');
  const date = new Date(normalized);
  if (Number.isNaN(date.valueOf())) return String(value);
  return new Intl.DateTimeFormat(locale || undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export class OdooChatter extends BaseComponent {
  constructor(id: string, state: any = {}, private readonly def: any = {}) {
    super(id, state);
  }

  draw(container: HTMLElement) {
    const record = this.state.record || {};
    const messages = Array.isArray(this.state.messages) ? this.state.messages : [];
    const followers = Array.isArray(this.state.followers) ? this.state.followers : [];
    const attachments = Array.isArray(this.state.attachments) ? this.state.attachments : [];
    const chatter = document.createElement('aside');
    chatter.className = 'o-form-chatter';
    chatter.setAttribute('aria-label', String(this.def.chatter_label || 'Chatter'));
    container.appendChild(chatter);

    const top = document.createElement('div');
    top.className = 'o-form-chatter-top';
    chatter.appendChild(top);
    const topbar = document.createElement('div');
    topbar.className = 'o-form-chatter-topbar';
    top.appendChild(topbar);

    const composerMode = String(this.state.composerMode || '');
    const actions = [
      { label: this.def.message_label || 'Send message', action: this.def.message_action, mode: 'message' },
      { label: this.def.note_label || 'Log note', action: this.def.note_action, mode: 'note' },
      { label: this.def.activity_label || 'Activity', action: this.def.activity_action, mode: 'activity' },
    ].filter(item => Boolean(item.action));
    for (const item of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `o-form-chatter-${item.mode === 'message' ? 'primary' : 'secondary'}${composerMode === item.mode ? ' is-active' : ''}`;
      button.textContent = String(item.label);
      button.setAttribute('aria-pressed', String(composerMode === item.mode));
      button.addEventListener('click', () => this.setState({ composerMode: composerMode === item.mode ? '' : item.mode }));
      topbar.appendChild(button);
    }

    const tools = document.createElement('div');
    tools.className = 'o-form-chatter-tools';
    if (this.def.attachment_source) {
      tools.appendChild(this.renderToolMenu({
        icon: 'file',
        count: attachments.length,
        label: this.def.attachment_label || 'Attachments',
        rows: attachments,
        rowLabel: (row: any) => row.file_name || row.name,
      }));
    }
    if (this.def.follower_source) {
      tools.appendChild(this.renderToolMenu({
        icon: 'users',
        count: followers.length,
        label: this.def.follower_label || 'Followers',
        rows: followers,
        rowLabel: (row: any) => row.name || row.actor_name || row.created_by,
      }));
    }
    if (tools.childElementCount) topbar.appendChild(tools);

    const activeAction = actions.find(item => item.mode === composerMode);
    if (activeAction) top.appendChild(this.renderComposer(activeAction, record));

    const stream = document.createElement('section');
    stream.className = 'o-form-chatter-stream';
    const streamHeading = document.createElement('h2');
    streamHeading.textContent = String(this.def.chatter_label || 'Messages and activities');
    stream.appendChild(streamHeading);
    if (!messages.length) {
      const empty = document.createElement('p');
      empty.className = 'o-form-chatter-empty';
      empty.textContent = String(this.def.chatter_empty || 'No messages or activities yet');
      stream.appendChild(empty);
    }
    for (const message of messages) stream.appendChild(this.renderMessage(message));
    chatter.appendChild(stream);
  }

  private renderToolMenu(options: { icon: string; count: number; label: string; rows: any[]; rowLabel: (row: any) => unknown }) {
    const details = document.createElement('details');
    details.className = 'o-form-chatter-tool-menu';
    const summary = document.createElement('summary');
    summary.className = 'o-form-chatter-tool';
    summary.setAttribute('aria-label', `${options.count} ${options.label.toLocaleLowerCase()}`);
    summary.title = `${options.count} ${options.label.toLocaleLowerCase()}`;
    appendIcon(summary, options.icon);
    const count = document.createElement('sup');
    count.textContent = String(options.count);
    summary.appendChild(count);
    details.appendChild(summary);
    const menu = document.createElement('div');
    menu.className = 'o-form-chatter-tool-dropdown';
    const heading = document.createElement('h3');
    heading.textContent = options.label;
    menu.appendChild(heading);
    if (!options.rows.length) {
      const empty = document.createElement('p');
      empty.className = 'o-form-chatter-empty';
      empty.textContent = `No ${options.label.toLocaleLowerCase()}`;
      menu.appendChild(empty);
    } else {
      const list = document.createElement('ul');
      for (const row of options.rows) {
        const item = document.createElement('li');
        item.textContent = String(options.rowLabel(row) || '—');
        list.appendChild(item);
      }
      menu.appendChild(list);
    }
    details.appendChild(menu);
    return details;
  }

  private renderComposer(item: { action: unknown; mode: string }, record: any) {
    const composer = document.createElement('form');
    composer.className = `o-form-composer is-${item.mode}`;
    const input = document.createElement('textarea');
    input.placeholder = String(item.mode === 'message'
      ? this.def.message_placeholder || 'Write a message…'
      : item.mode === 'note'
        ? this.def.note_placeholder || 'Log an internal note…'
        : this.def.activity_placeholder || 'Describe the activity…');
    input.setAttribute('aria-label', input.placeholder);
    input.required = true;
    const actions = document.createElement('div');
    actions.className = 'o-form-composer-actions';
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'o-form-composer-submit';
    submit.textContent = String(item.mode === 'message'
      ? this.def.send_label || 'Send'
      : item.mode === 'note'
        ? this.def.log_label || 'Log note'
        : this.def.schedule_label || 'Schedule');
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'o-form-composer-cancel';
    cancel.textContent = String(this.def.cancel_label || 'Cancel');
    cancel.addEventListener('click', () => this.setState({ composerMode: '' }));
    actions.append(submit, cancel);
    composer.append(input, actions);
    composer.addEventListener('submit', event => {
      event.preventDefault();
      const content = input.value.trim();
      if (!content) return;
      submit.disabled = true;
      void Promise.resolve(this.submit(String(item.action), { id: record.id, content }))
        .then(() => this.setState({ composerMode: '' }))
        .finally(() => { submit.disabled = false; });
    });
    queueMicrotask(() => input.focus());
    return composer;
  }

  private renderMessage(message: any) {
    const action = String(message.action || '');
    const type = action.endsWith('.note') ? 'note' : action.endsWith('.message') ? 'message' : 'activity';
    const entry = document.createElement('article');
    entry.className = `o-form-chatter-message is-${type}`;
    const actor = message[this.def.message_actor_field || 'actor_name'];
    const avatar = document.createElement('span');
    avatar.className = 'o-form-chatter-avatar';
    avatar.textContent = initials(actor);
    avatar.setAttribute('aria-hidden', 'true');
    const content = document.createElement('div');
    content.className = 'o-form-chatter-message-content';
    const meta = document.createElement('div');
    meta.className = 'o-form-chatter-message-meta';
    const author = document.createElement('strong');
    author.textContent = String(actor || 'System');
    const timestamp = document.createElement('time');
    const timestampValue = message[this.def.message_timestamp_field || 'created_at'];
    timestamp.textContent = formatTimestamp(timestampValue, this.def.locale);
    if (timestampValue) timestamp.dateTime = String(timestampValue);
    meta.append(author, timestamp);
    const body = document.createElement('p');
    body.textContent = String(message[this.def.message_action_field || 'action_label'] || message.action || 'Activity');
    const detail = document.createElement('span');
    detail.textContent = String(message[this.def.message_detail_field || 'detail'] || '');
    content.append(meta, body, detail);
    entry.append(avatar, content);
    return entry;
  }
}
