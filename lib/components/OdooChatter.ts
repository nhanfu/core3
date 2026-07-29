import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

export class OdooChatter extends BaseComponent {
  constructor(id: string, state: { messages?: any[]; activities?: any[]; followers?: any[]; attachments?: any[] } = {}) {
    super(id, { messages: state.messages || [], activities: state.activities || [], followers: state.followers || [], attachments: state.attachments || [] });
  }

  draw(container: HTMLElement) {
    const root = html.take(container).aside.className('odoo-chatter').getContext();
    html.take(root).strong.text('Chatter');
    const messages = html.take(root).div.className('odoo-chatter-messages').getContext();
    if (!(this.state.messages || []).length) html.take(messages).p.className('odoo-muted').text('No messages yet.');
    for (const message of this.state.messages || []) {
      const item = html.take(messages).div.className('odoo-message').getContext();
      html.take(item).strong.text(String(message.author || '')); 
      html.take(item).p.text(String(message.body || ''));
    }
    const note = html.take(root).textArea.className('odoo-chatter-input').attr('placeholder', 'Log a note… Use @mentions').getContext() as HTMLTextAreaElement;
    const send = html.take(root).button.className('odoo-button secondary').type('button').text('Send message').getContext();
    send.addEventListener('click', () => void this.submit('message', { body: note.value }));
    const activities = html.take(root).div.className('odoo-activity-list').getContext();
    html.take(activities).strong.text('Activities');
    for (const activity of this.state.activities || []) {
      const item = html.take(activities).div.className('odoo-activity').getContext();
      html.take(item).span.text(String(activity.activity_type || 'To-do'));
      html.take(item).text(` ${String(activity.summary || '')}`);
      html.take(item).small.text(String(activity.due_date || ''));
    }
    const activityInput = html.take(root).input.className('odoo-chatter-input').attr('placeholder', 'Schedule activity…').getContext() as HTMLInputElement;
    const schedule = html.take(root).button.className('odoo-button secondary').type('button').text('Schedule').getContext();
    schedule.addEventListener('click', () => void this.submit('activity', { summary: activityInput.value }));

    const followers = html.take(root).div.className('odoo-chatter-section').getContext();
    html.take(followers).strong.text('Followers');
    html.take(followers).p.className('odoo-muted').text((this.state.followers || []).map((item: any) => item.name).join(', ') || 'No followers yet.');
    const followerInput = html.take(followers).input.className('odoo-chatter-input').attr('placeholder', 'Add follower…').getContext() as HTMLInputElement;
    const follow = html.take(followers).button.className('odoo-button secondary').type('button').text('Follow').getContext();
    follow.addEventListener('click', () => void this.submit('follower', { name: followerInput.value }));

    const attachments = html.take(root).div.className('odoo-chatter-section').getContext();
    html.take(attachments).strong.text('Attachments');
    html.take(attachments).p.className('odoo-muted').text((this.state.attachments || []).map((item: any) => item.name).join(', ') || 'No attachments yet.');
    const file = html.take(attachments).input.className('odoo-chatter-input').attr('type', 'file').getContext() as HTMLInputElement;
    file.addEventListener('change', () => void this.submit('attachment', { name: file.files?.[0]?.name || '' }));
  }
}
