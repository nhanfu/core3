/**
 * Base contract for all POS hardware device adapters.
 *
 * Real vendor implementations sit behind this interface and explicit
 * device permissions. The browser-safe mock is the default.
 */

export type DeviceStatus = 'connected' | 'disconnected' | 'error';

export interface PosDeviceAdapter {
  readonly kind: string;
  readonly status: DeviceStatus;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onStatusChange(cb: (status: DeviceStatus) => void): void;
}

/** Barcode / QR scanner adapter */
export interface BarcodeScannerAdapter extends PosDeviceAdapter {
  readonly kind: 'barcode_scanner';
  onScan(cb: (barcode: string) => void): void;
  offScan(cb: (barcode: string) => void): void;
}

/** Receipt / kitchen printer adapter */
export interface PrinterAdapter extends PosDeviceAdapter {
  readonly kind: 'printer';
  printReceipt(data: ReceiptData): Promise<PrintResult>;
  printKitchenTicket(data: KitchenTicketData): Promise<PrintResult>;
}

export type ReceiptData = {
  order_name: string;
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
  paid: number;
  change: number;
  payment_method: string;
  footer?: string;
};

export type KitchenTicketData = {
  order_name: string;
  table?: string;
  items: Array<{ name: string; qty: number; notes?: string }>;
};

export type PrintResult = { success: boolean; error?: string };

/** Cash drawer adapter */
export interface CashDrawerAdapter extends PosDeviceAdapter {
  readonly kind: 'cash_drawer';
  open(): Promise<void>;
}

/** Customer-facing display — minimized projection only, never exposes session token */
export interface CustomerDisplayAdapter extends PosDeviceAdapter {
  readonly kind: 'customer_display';
  showOrder(projection: CustomerOrderProjection): Promise<void>;
  showIdle(): Promise<void>;
}

export type CustomerOrderProjection = {
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
  currency: string;
};

/** Payment terminal adapter */
export interface PaymentTerminalAdapter extends PosDeviceAdapter {
  readonly kind: 'payment_terminal';
  /** Authorize/initiate a payment. Returns a provider reference for reconciliation. */
  authorize(amount: number, currency: string, reference: string): Promise<TerminalAuthResult>;
  /** Check status of a payment by provider reference. */
  checkStatus(reference: string): Promise<TerminalStatusResult>;
  /** Cancel/void a pending payment. */
  cancel(reference: string): Promise<void>;
}

export type TerminalAuthResult = {
  status: 'approved' | 'declined' | 'pending' | 'error';
  provider_reference?: string;
  error?: string;
};

export type TerminalStatusResult = {
  status: 'approved' | 'declined' | 'pending' | 'error';
  provider_reference?: string;
};
