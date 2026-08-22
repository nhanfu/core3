import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';
import { html } from '@core3/client/html';
import { OdooAttachmentPanel } from './OdooAttachmentPanel.ts';
import { OdooFollowerManager } from './OdooFollowerManager.ts';
import { i18n } from '@core3/client/i18n';

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
    this.disposeChildren();
    const record = this.state.record || {};
    const messages = Array.isArray(this.state.messages) ? this.state.messages : [];
    const followers = Array.isArray(this.state.followers) ? this.state.followers : [];
    const attachments = Array.isArray(this.state.attachments) ? this.state.attachments : [];
    const followerCandidates = Array.isArray(this.state.followerCandidates) ? this.state.followerCandidates : [];
    const chatter = html.take(container).aside.className('o-form-chatter')
      .attr('aria-label', String(this.def.chatter_label || i18n.tKey('chatter.title', {}, 'Chatter'))).ele() as HTMLElement;

    const top = html.take(chatter).div.className('o-form-chatter-top').ele() as HTMLDivElement;
    const topbar = html.take(top).div.className('o-form-chatter-topbar').ele() as HTMLDivElement;

    const composerMode = String(this.state.composerMode || '');
    const actions = [
      { label: this.def.message_label || i18n.tKey('chatter.send_message', {}, 'Send message'), action: this.def.message_action, mode: 'message' },
      { label: this.def.note_label || i18n.tKey('chatter.log_note', {}, 'Log note'), action: this.def.note_action, mode: 'note' },
      { label: this.def.activity_label || i18n.tKey('chatter.activity', {}, 'Activity'), action: this.def.activity_action, mode: 'activity' },
    ].filter(item => Boolean(item.action));
    for (const item of actions) {
      html.take(topbar).button.type('button')
        .className(`o-form-chatter-${item.mode === 'message' ? 'primary' : 'secondary'}${composerMode === item.mode ? ' is-active' : ''}`)
        .text(String(item.label)).attr('aria-pressed', String(composerMode === item.mode))
        .event('click', () => this.setState({ composerMode: composerMode === item.mode ? '' : item.mode }));
    }

    const tools = html.take(topbar).div.className('o-form-chatter-tools').ele() as HTMLDivElement;
    if (this.def.attachment_source) {
      const attachmentTool = this.renderToolMenu(tools, {
        icon: 'file',
        count: attachments.length,
        label: this.def.attachment_label || i18n.tKey('chatter.attachments', {}, 'Attachments'),
      });
      const panel = new OdooAttachmentPanel(`${this.id}-attachments`, { record, attachments }, this.def);
      panel.parent = this;
      this.children.push(panel);
      panel.mount(attachmentTool.content);
    }
    if (this.def.follower_source) {
      const followerTool = this.renderToolMenu(tools, {
        icon: 'users',
        count: followers.length,
        label: this.def.follower_label || i18n.tKey('chatter.followers', {}, 'Followers'),
      });
      const manager = new OdooFollowerManager(`${this.id}-followers`, {
        record,
        followers,
        candidates: followerCandidates,
      }, this.def);
      manager.parent = this;
      this.children.push(manager);
      manager.mount(followerTool.content);
    }
    if (!tools.childElementCount) html.take(tools).remove();

    const activeAction = actions.find(item => item.mode === composerMode);
    if (activeAction) this.renderComposer(activeAction, record, top);

    const stream = html.take(chatter).section.className('o-form-chatter-stream').ele() as HTMLElement;
    html.take(stream).h2.text(String(this.def.chatter_label || i18n.tKey('chatter.messages_activities', {}, 'Messages and activities')));
    if (!messages.length) {
      html.take(stream).p.className('o-form-chatter-empty').text(String(this.def.chatter_empty || i18n.tKey('chatter.empty', {}, 'No messages or activities yet')));
    }
    for (const message of messages) this.renderMessage(message, stream);
  }

  private renderToolMenu(parent: HTMLElement, options: { icon: string; count: number; label: string }) {
    const details = html.take(parent).details.className('o-form-chatter-tool-menu').ele() as HTMLDetailsElement;
    const summary = html.take(details).summary.className('o-form-chatter-tool')
      .attr('aria-label', `${options.count} ${options.label.toLocaleLowerCase()}`).attr('title', `${options.count} ${options.label.toLocaleLowerCase()}`).ele() as HTMLElement;
    appendIcon(summary, options.icon);
    html.take(summary).sup.text(String(options.count));
    const menu = html.take(details).div.className('o-form-chatter-tool-dropdown').ele() as HTMLDivElement;
    html.take(menu).h3.text(options.label);
    const content = html.take(menu).div.className('o-form-chatter-tool-content').ele() as HTMLDivElement;
    return { details, content };
  }

  private renderComposer(item: { action: unknown; mode: string }, record: any, parent: HTMLElement) {
    const composer = html.take(parent).form.className(`o-form-composer is-${item.mode}`).ele() as HTMLFormElement;
    const placeholder = String(item.mode === 'message'
      ? this.def.message_placeholder || i18n.tKey('chatter.message_placeholder', {}, 'Write a message…')
      : item.mode === 'note'
        ? this.def.note_placeholder || i18n.tKey('chatter.note_placeholder', {}, 'Log an internal note…')
        : this.def.activity_placeholder || i18n.tKey('chatter.activity_placeholder', {}, 'Describe the activity…'));
    const input = html.take(composer).textArea.attr('placeholder', placeholder).ele() as HTMLTextAreaElement;
    html.take(input).attr('aria-label', input.placeholder).prop('required', true);
    const actions = html.take(composer).div.className('o-form-composer-actions').ele() as HTMLDivElement;
    const submit = html.take(actions).button.type('submit').className('o-form-composer-submit').text(String(item.mode === 'message'
      ? this.def.send_label || i18n.tKey('labels.send', {}, 'Send')
      : item.mode === 'note'
        ? this.def.log_label || i18n.tKey('chatter.log_note', {}, 'Log note')
        : this.def.schedule_label || i18n.tKey('chatter.schedule', {}, 'Schedule'))).ele() as HTMLButtonElement;
    html.take(actions).button.type('button').className('o-form-composer-cancel').text(String(this.def.cancel_label || i18n.tKey('labels.cancel', {}, 'Cancel')))
      .event('click', () => this.setState({ composerMode: '' }));
    html.take(composer).event('submit', event => {
      event.preventDefault();
      const content = input.value.trim();
      if (!content) return;
      html.take(submit).prop('disabled', true);
      void Promise.resolve(this.submit(String(item.action), { id: record.id, content }))
        .then(() => this.setState({ composerMode: '' }))
        .finally(() => { html.take(submit).prop('disabled', false); });
    });
    queueMicrotask(() => html.take(input).focus());
    return composer;
  }

  private renderMessage(message: any, parent: HTMLElement) {
    const action = String(message.action || '');
    const type = action.endsWith('.note') ? 'note' : action.endsWith('.message') ? 'message' : 'activity';
    const entry = html.take(parent).article.className(`o-form-chatter-message is-${type}`).ele() as HTMLElement;
    const actor = message[this.def.message_actor_field || 'actor_name'];
    html.take(entry).span.className('o-form-chatter-avatar').text(initials(actor)).attr('aria-hidden', 'true');
    const content = html.take(entry).div.className('o-form-chatter-message-content').ele() as HTMLDivElement;
    const meta = html.take(content).div.className('o-form-chatter-message-meta').ele() as HTMLDivElement;
    html.take(meta).strong.text(String(actor || i18n.tKey('labels.system', {}, 'System')));
    const timestamp = html.take(meta).time.ele() as HTMLTimeElement;
    const timestampValue = message[this.def.message_timestamp_field || 'created_at'];
    html.take(timestamp).replaceText(formatTimestamp(timestampValue, this.def.locale));
    if (timestampValue) timestamp.dateTime = String(timestampValue);
    const actionLabel = this.def.message_action_labels?.[action]
      || message[this.def.message_action_field || 'action_label']
      || message.action
      || i18n.tKey('chatter.activity', {}, 'Activity');
    html.take(content).p.text(String(actionLabel));
    const detailValue = message[this.def.message_detail_field || 'detail'] || '';
    html.take(content).span.text(String(this.def.message_detail_labels?.[detailValue] || detailValue));
  }
}
