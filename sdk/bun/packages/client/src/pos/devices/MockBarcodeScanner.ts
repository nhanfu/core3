/**
 * Browser-safe mock barcode scanner.
 *
 * Listens for rapid keystrokes ending with Enter on the document body
 * (the same pattern as USB HID barcode scanners). Fires onScan callbacks
 * with the accumulated barcode string.
 */

import type { BarcodeScannerAdapter, DeviceStatus } from './PosDeviceAdapter.ts';

const SCAN_TIMEOUT_MS = 80;
const MIN_SCAN_LENGTH = 3;

export class MockBarcodeScanner implements BarcodeScannerAdapter {
  readonly kind = 'barcode_scanner' as const;
  private _status: DeviceStatus = 'disconnected';
  private _buffer = '';
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _scanCallbacks: Set<(barcode: string) => void> = new Set();
  private _statusCallbacks: Set<(status: DeviceStatus) => void> = new Set();
  private _boundHandler: ((e: KeyboardEvent) => void) | null = null;

  get status() { return this._status; }

  async connect() {
    if (this._status === 'connected') return;
    this._boundHandler = this._onKeydown.bind(this);
    document.addEventListener('keydown', this._boundHandler);
    this._status = 'connected';
    this._emit('connected');
  }

  async disconnect() {
    if (this._boundHandler) {
      document.removeEventListener('keydown', this._boundHandler);
      this._boundHandler = null;
    }
    if (this._timer) clearTimeout(this._timer);
    this._buffer = '';
    this._status = 'disconnected';
    this._emit('disconnected');
  }

  onStatusChange(cb: (status: DeviceStatus) => void) { this._statusCallbacks.add(cb); }
  onScan(cb: (barcode: string) => void) { this._scanCallbacks.add(cb); }
  offScan(cb: (barcode: string) => void) { this._scanCallbacks.delete(cb); }

  /** Programmatically simulate a scan (for testing). */
  simulateScan(barcode: string) {
    if (this._status !== 'connected') return;
    for (const cb of this._scanCallbacks) cb(barcode);
  }

  private _onKeydown(e: KeyboardEvent) {
    // Ignore events from form inputs
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'Enter') {
      if (this._buffer.length >= MIN_SCAN_LENGTH) {
        const barcode = this._buffer;
        this._buffer = '';
        if (this._timer) { clearTimeout(this._timer); this._timer = null; }
        for (const cb of this._scanCallbacks) cb(barcode);
      } else {
        this._buffer = '';
      }
      return;
    }

    if (e.key.length === 1) {
      this._buffer += e.key;
      if (this._timer) clearTimeout(this._timer);
      this._timer = setTimeout(() => { this._buffer = ''; }, SCAN_TIMEOUT_MS);
    }
  }

  private _emit(status: DeviceStatus) {
    for (const cb of this._statusCallbacks) cb(status);
  }
}
