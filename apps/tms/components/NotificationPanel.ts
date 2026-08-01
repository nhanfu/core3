import { BaseComponent } from '../../lib/runtime.ts';
import { html } from '../../lib/html.ts';
import { appendIcon } from '../../lib/components/Icon.ts';
import { getToken } from '../../lib/public/app.ts';
import { i18n } from '../i18n.ts';

const TYPE_ICONS: Record<string, string> = {
  alert:                 'warning',
  warning:               'warning',
  info:                  'info',
  success:               'check',
  service_overdue:        'wrench',
  trip_completed:         'check',
  license_expiring:       'document',
  maintenance_scheduled:  'calendar',
  user_invited:           'users',
  default:                'bell',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (i18n.lang === 'vi') {
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  }
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export class NotificationPanel extends BaseComponent {
  _el: HTMLElement | null;
  _listEl: HTMLElement | null;
  _pollTimer: ReturnType<typeof setInterval> | null;
  _outsideHandler: ((e: MouseEvent) => void) | null;
  _onBadgeChange: ((n: number) => void) | null;

  constructor(id: string, state: any) {
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
      const notifications: any[] = await res.json();
      const unread = notifications.filter((n) => !n.read).length;
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

  dispose() {
    this.stopPolling();
    this.close();
    this._onBadgeChange = null;
    this._el?.remove();
    this._el = null;
    this._listEl = null;
    super.dispose();
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
        this._outsideHandler = (e: MouseEvent) => {
          if (!this._el?.contains(e.target as Node | null)) this.close();
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
    (this.state.notifications as any[]).forEach((n) => { n.read = true; });
    this.state.unread = 0;
    this._onBadgeChange?.(0);
    this._renderList();
  }

  async markRead(notificationId: string) {
    try {
      const token = getToken();
      const response = await fetch(`/api/v1/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
    } catch {
      return;
    }
    const notification = (this.state.notifications as any[]).find(item => String(item.id) === String(notificationId));
    if (!notification || notification.read) return;
    notification.read = true;
    this.state.unread = Math.max(0, Number(this.state.unread || 0) - 1);
    this._onBadgeChange?.(this.state.unread);
    this._renderList();
  }

  refreshLanguage() {
    if (!this._el) return;
    const title = this._el.querySelector('.notif-panel-title');
    if (title) title.textContent = i18n.t('*', null, 'Notifications');
    const markAll = this._el.querySelector('.notif-mark-all');
    if (markAll) markAll.textContent = i18n.t('*', null, 'Mark all read');
    this._renderList();
  }

  _renderList() {
    if (!this._listEl) return;
    this._listEl.innerHTML = '';
    const notifs: any[] = this.state.notifications || [];
    if (!notifs.length) {
      html.take(this._listEl).div.className('notif-empty').text(i18n.t('*', null, 'No notifications'));
      return;
    }
    for (const n of notifs) {
      const icon = TYPE_ICONS[n.type] || TYPE_ICONS.default;
      const item = html.take(this._listEl).button
        .className('notif-item' + (!n.read ? ' unread' : ''))
        .attr('type', 'button')
        .attr('aria-label', `${n.read ? '' : 'Chưa đọc: '}${n.title}`)
        .getContext();
      item.addEventListener('click', () => {
        if (!n.read) void this.markRead(String(n.id));
      });
      const iconTarget = html.take(item).span.className('notif-item-icon').getContext();
      appendIcon(iconTarget, icon, n.title || '');
      const body = html.take(item).div.className('notif-item-body').getContext();
      html.take(body).div.className('notif-item-title').text(n.title);
      if (n.body) html.take(body).div.className('notif-item-text').text(n.body);
      html.take(body).div.className('notif-item-time').text(timeAgo(n.created_at));
    }
  }

  draw(container: HTMLElement) {
    this._el = html.take(container).div
      .className('notif-panel')
      .style('display:none')
      .getContext();

    const header = html.take(this._el).div.className('notif-panel-header').getContext();
    html.take(header).span.className('notif-panel-title').text(i18n.t('*', null, 'Notifications'));
    html.take(header).button
      .className('notif-mark-all')
      .text(i18n.t('*', null, 'Mark all read'))
      .event('click', (e: MouseEvent) => {
        e.stopPropagation();
        this.markAllRead();
      });

    this._listEl = html.take(this._el).div.className('notif-list').getContext();
    this._renderList();

    this.startPolling();
  }
}
