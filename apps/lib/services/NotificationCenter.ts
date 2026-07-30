export type Notification = { id: string; level: 'info' | 'success' | 'warning' | 'error'; message: string };

/** Generic in-memory notification contract; rendering remains a UI concern. */
export class NotificationCenter {
  private items: Notification[] = [];
  push(notification: Omit<Notification, 'id'>) {
    const item = { ...notification, id: crypto.randomUUID() };
    this.items.push(item);
    return item;
  }
  list() { return [...this.items]; }
  dismiss(id: string) { this.items = this.items.filter(item => item.id !== id); }
}
