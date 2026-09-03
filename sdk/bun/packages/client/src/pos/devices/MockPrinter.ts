/**
 * Browser-safe mock receipt printer.
 *
 * Opens the browser print dialog with a formatted receipt.
 * Real vendor adapters replace this with ESC/POS or Star/Epson SDK calls.
 */

import type { PrinterAdapter, DeviceStatus, ReceiptData, KitchenTicketData, PrintResult } from './PosDeviceAdapter.ts';

export class MockPrinter implements PrinterAdapter {
  readonly kind = 'printer' as const;
  private _status: DeviceStatus = 'disconnected';
  private _statusCallbacks: Set<(status: DeviceStatus) => void> = new Set();

  get status() { return this._status; }

  async connect() {
    this._status = 'connected';
    this._emit('connected');
  }

  async disconnect() {
    this._status = 'disconnected';
    this._emit('disconnected');
  }

  onStatusChange(cb: (status: DeviceStatus) => void) { this._statusCallbacks.add(cb); }

  async printReceipt(data: ReceiptData): Promise<PrintResult> {
    if (this._status !== 'connected') return { success: false, error: 'Printer not connected' };
    try {
      const win = window.open('', '_blank', 'width=400,height=600');
      if (!win) return { success: false, error: 'Popup blocked' };
      win.document.write(this._receiptHtml(data));
      win.document.close();
      win.focus();
      win.print();
      win.close();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async printKitchenTicket(data: KitchenTicketData): Promise<PrintResult> {
    if (this._status !== 'connected') return { success: false, error: 'Printer not connected' };
    try {
      const win = window.open('', '_blank', 'width=300,height=400');
      if (!win) return { success: false, error: 'Popup blocked' };
      win.document.write(this._kitchenHtml(data));
      win.document.close();
      win.focus();
      win.print();
      win.close();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  private _receiptHtml(d: ReceiptData): string {
    const lines = d.items.map(i =>
      `<tr><td>${i.qty}× ${i.name}</td><td style="text-align:right">$${i.price.toFixed(2)}</td></tr>`
    ).join('');
    return `<!DOCTYPE html><html><head><style>
      body{font-family:monospace;font-size:12px;width:300px;margin:0 auto}
      table{width:100%;border-collapse:collapse} td{padding:2px 0}
      hr{border-top:1px dashed #000;margin:8px 0}
      .total{font-weight:bold;font-size:14px}
    </style></head><body>
      <div style="text-align:center;font-size:16px;font-weight:bold;margin-bottom:8px">${d.order_name}</div>
      <hr>
      <table>${lines}</table>
      <hr>
      <table>
        <tr class="total"><td>Total</td><td style="text-align:right">$${d.total.toFixed(2)}</td></tr>
        <tr><td>Paid (${d.payment_method})</td><td style="text-align:right">$${d.paid.toFixed(2)}</td></tr>
        <tr><td>Change</td><td style="text-align:right">$${d.change.toFixed(2)}</td></tr>
      </table>
      <hr>
      ${d.footer ? `<div style="text-align:center">${d.footer}</div>` : ''}
    </body></html>`;
  }

  private _kitchenHtml(d: KitchenTicketData): string {
    const lines = d.items.map(i =>
      `<tr><td>${i.qty}× ${i.name}${i.notes ? ` — ${i.notes}` : ''}</td></tr>`
    ).join('');
    return `<!DOCTYPE html><html><head><style>
      body{font-family:monospace;font-size:14px;width:280px;margin:0 auto}
    </style></head><body>
      <div style="font-size:18px;font-weight:bold">${d.order_name}</div>
      ${d.table ? `<div>Table: ${d.table}</div>` : ''}
      <hr>
      <table>${lines}</table>
    </body></html>`;
  }

  private _emit(status: DeviceStatus) {
    for (const cb of this._statusCallbacks) cb(status);
  }
}
