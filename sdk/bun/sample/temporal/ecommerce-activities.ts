import type { PaymentDeliveryInput } from './ecommerce-workflows';

type PaymentResult = { state: string; provider_reference: string };
type DeliveryResult = { state: string; tracking_reference: string };

const paymentResults = new Map<string, PaymentResult>();
const deliveryResults = new Map<string, DeliveryResult>();
const callbackResults = new Set<string>();

function required(value: string, field: string): string {
  const normalized = String(value || '').trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

export async function authorizePayment(input: PaymentDeliveryInput): Promise<PaymentResult> {
  const orderId = required(input.order_id, 'order_id');
  const existing = paymentResults.get(orderId);
  if (existing) return existing;
  const result = { state: 'Authorized', provider_reference: `payment-${orderId}` };
  paymentResults.set(orderId, result);
  return result;
}

export async function createDelivery(input: PaymentDeliveryInput & { payment_reference: string }): Promise<DeliveryResult> {
  const orderId = required(input.order_id, 'order_id');
  const existing = deliveryResults.get(orderId);
  if (existing) return existing;
  const result = { state: 'Ready', tracking_reference: `delivery-${orderId}` };
  deliveryResults.set(orderId, result);
  return result;
}

export async function recordCallback(input: { callback_id: string; order_id: string; status: string }): Promise<{ recorded: boolean }> {
  const callbackId = required(input.callback_id, 'callback_id');
  required(input.order_id, 'order_id');
  required(input.status, 'status');
  if (callbackResults.has(callbackId)) return { recorded: false };
  callbackResults.add(callbackId);
  return { recorded: true };
}

export async function cancelPaymentAndReleaseDelivery(input: { order_id: string; reason: string }): Promise<{ compensated: boolean }> {
  required(input.order_id, 'order_id');
  paymentResults.delete(input.order_id);
  deliveryResults.delete(input.order_id);
  return { compensated: true };
}
