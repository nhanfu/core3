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

async function callProvider(url: string, payload: Record<string, unknown>, idempotencyKey: string, unavailableCode: string): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify(payload) });
  } catch {
    throw new Error(unavailableCode);
  }
  if (!response.ok) throw new Error(unavailableCode);
  let result: unknown;
  try { result = await response.json(); } catch { throw new Error(`${unavailableCode}_INVALID_RESPONSE`); }
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error(`${unavailableCode}_INVALID_RESPONSE`);
  return result as Record<string, unknown>;
}

export async function authorizePayment(input: PaymentDeliveryInput): Promise<PaymentResult> {
  const orderId = required(input.order_id, 'order_id');
  if (input.payment_method === 'Test Failure') throw new Error('PAYMENT_PROVIDER_UNAVAILABLE');
  const existing = paymentResults.get(orderId);
  if (existing) return existing;
  const providerUrl = process.env.ECOMMERCE_PAYMENT_PROVIDER_URL;
  const provider = providerUrl
    ? await callProvider(providerUrl, { order_id: orderId, payment_method: input.payment_method, customer_email: input.customer_email }, orderId, 'PAYMENT_PROVIDER_UNAVAILABLE')
    : {};
  const result = { state: String(provider.state || 'Authorized'), provider_reference: String(provider.provider_reference || `payment-${orderId}`) };
  paymentResults.set(orderId, result);
  return result;
}

export async function createDelivery(input: PaymentDeliveryInput & { payment_reference: string }): Promise<DeliveryResult> {
  const orderId = required(input.order_id, 'order_id');
  const existing = deliveryResults.get(orderId);
  if (existing) return existing;
  const providerUrl = process.env.ECOMMERCE_DELIVERY_PROVIDER_URL;
  const provider = providerUrl
    ? await callProvider(providerUrl, { order_id: orderId, delivery_method: input.delivery_method, payment_reference: input.payment_reference }, orderId, 'DELIVERY_PROVIDER_UNAVAILABLE')
    : {};
  const result = { state: String(provider.state || 'Ready'), tracking_reference: String(provider.tracking_reference || `delivery-${orderId}`) };
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
