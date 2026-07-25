import { BaseComponent } from '/lib/runtime.js';
import { html } from '/lib/html.js';
import { getToken } from '/tms/app.js';

const TYPE_ICONS = {
  service_overdue:        '🔧',
  trip_completed:         '✅',
  license_expiring:       '📋',
  maintenance_scheduled:  '📅',
  user_invited:           '👤',
  default:                '🔔',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export class NotificationPanel extends BaseComponent {
  constructor(id, state) {
    super(id, { open: false, notifications: [], unread: 0, ...state });
    this._container = null;
    this._el = null;
    this._listEl = null;
    this._pollTimer = null;
    this._outsideHandler = null;
    this._onBadgeChange = null; // set by AppShell
  }

  async fetch() {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch('/api/v1/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const notifications = await res.json();
      const unread = notifications.filter(n => !n.read).length;
      this.state.notifications = notifications;
      this.state.unread = unread;
      this._onBadgeChange?.(unread);
      if (this.state.open) this._renderList();
    } catch {
      // silently ignore fetch errors
    }
  }

  startPolling() {
    this.fetch();
    this._pollTimer = setInterval(() => this.fetch(), 30000);
  }

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  toggle() {
    if (this.state.open) {
      this.close();
    } else {
      this.state.open = true;
      if (this._el) this._el.style.display = 'block';
      this._renderList();
      // Close on outside click — defer so the bell's own click doesn't immediately close it
      setTimeout(() => {
        this._outsideHandler = (e) => {
          if (!this._el?.contains(e.target)) this.close();
        };
        document.addEventListener('click', this._outsideHandler);
      }, 0);
    }
  }

  close() {
    this.state.open = false;
    if (this._el) this._el.style.display = 'none';
    if (this._outsideHandler) {
      document.removeEventListener('click', this._outsideHandler);
      this._outsideHandler = null;
    }
  }

  async markAllRead() {
    try {
      const token = getToken();
      await fetch('/api/v1/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {
      // silently ignore
    }
    this.state.notifications.forEach(n => { n.read = true; });
    this.state.unread = 0;
    this._onBadgeChange?.(0);
    this._renderList();
  }

  _renderList() {
    if (!this._listEl) return;
    this._listEl.innerHTML = '';
    const notifs = this.state.notifications;
    if (!notifs.length) {
      html.take(this._listEl).div.className('notif-empty').text('No notifications');
      return;
    }
    for (const n of notifs) {
      const icon = TYPE_ICONS[n.type] || TYPE_ICONS.default;
      const item = html.take(this._listEl).div
        .className('notif-item' + (!n.read ? ' unread' : ''))
        .getContext();
      html.take(item).div.className('notif-item-icon').text(icon);
      const body = html.take(item).div.className('notif-item-body').getContext();
      html.take(body).div.className('notif-item-title').text(n.title);
      if (n.body) html.take(body).div.className('notif-item-text').text(n.body);
      html.take(body).div.className('notif-item-time').text(timeAgo(n.created_at));
    }
  }

  draw(container) {
    this._el = html.take(container).div
      .className('notif-panel')
      .style('display:none')
      .getContext();

    const header = html.take(this._el).div.className('notif-panel-header').getContext();
    html.take(header).span.className('notif-panel-title').text('Notifications');
    html.take(header).button
      .className('notif-mark-all')
      .text('Mark all read')
      .event('click', (e) => {
        e.stopPropagation();
        this.markAllRead();
      });

    this._listEl = html.take(this._el).div.className('notif-list').getContext();
    this._renderList();

    this.startPolling();
  }
}
