/**
 * Browser-safe mock customer-facing display.
 *
 * Opens a popup window at /point-of-sale/customer-display and posts
 * minimized order projections via postMessage. Never exposes the
 * authenticated session token or full catalog data.
 */

import type { CustomerDisplayAdapter, DeviceStatus, CustomerOrderProjection } from './PosDeviceAdapter.ts';

export class MockCustomerDisplay implements CustomerDisplayAdapter {
  readonly kind = 'customer_display' as const;
  private _status: DeviceStatus = 'disconnected';
  private _win: Window | null = null;
  private _statusCallbacks: Set<(status: DeviceStatus) => void> = new Set();

  get status() { return this._status; }

  async connect() {
    const win = window.open('/point-of-sale/customer-display', 'pos_customer_display', 'width=800,height=600');
    if (!win) {
      this._status = 'error';
      this._emit('error');
      return;
    }
    this._win = win;
    this._status = 'connected';
    this._emit('connected');
  }

  async disconnect() {
    this._win?.close();
    this._win = null;
    this._status = 'disconnected';
    this._emit('disconnected');
  }

  onStatusChange(cb: (status: DeviceStatus) => void) { this._statusCallbacks.add(cb); }

  async showOrder(projection: CustomerOrderProjection) {
    if (!this._win || this._win.closed) {
      this._status = 'disconnected';
      this._emit('disconnected');
      return;
    }
    // Minimized projection — no token, no session id, no catalog data
    this._win.postMessage({ type: 'pos:order', payload: projection }, window.location.origin);
  }

  async showIdle() {
    if (!this._win || this._win.closed) return;
    this._win.postMessage({ type: 'pos:idle' }, window.location.origin);
  }

  private _emit(status: DeviceStatus) {
    for (const cb of this._statusCallbacks) cb(status);
  }
}
