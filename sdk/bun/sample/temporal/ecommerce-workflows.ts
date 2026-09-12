import { condition, defineSignal, proxyActivities, setHandler, sleep } from '@temporalio/workflow';
import type * as activities from './ecommerce-activities';

export type PaymentDeliveryInput = {
  order_id: string;
  payment_method: string;
  delivery_method: string;
  customer_email?: string;
  await_callbacks?: boolean;
};

export type PaymentDeliveryResult = {
  order_id: string;
  payment_state: string;
  delivery_state: string;
};

const { authorizePayment, createDelivery, recordCallback, cancelPaymentAndReleaseDelivery } = proxyActivities<typeof activities>({
  startToCloseTimeout: '15 minutes',
  retry: { maximumAttempts: 5, backoffCoefficient: 2 },
});

export type ProviderCallback = { callback_id: string; order_id: string; status: string; provider_reference?: string; tracking_reference?: string };
export const paymentCallback = defineSignal<[ProviderCallback]>('paymentCallback');
export const deliveryCallback = defineSignal<[ProviderCallback]>('deliveryCallback');

export async function ecommercePaymentDelivery(input: PaymentDeliveryInput): Promise<PaymentDeliveryResult> {
  let paymentCallbackValue: ProviderCallback | undefined;
  let deliveryCallbackValue: ProviderCallback | undefined;
  setHandler(paymentCallback, callback => { paymentCallbackValue = callback; });
  setHandler(deliveryCallback, callback => { deliveryCallbackValue = callback; });
  try {
    // Keep a deterministic timer in the workflow so worker restart recovery is
    // exercised before external side effects begin.
    await sleep('2 seconds');
    const payment = await authorizePayment(input);
    if (input.await_callbacks) {
      if (!await condition(() => Boolean(paymentCallbackValue), '24 hours')) throw new Error('Payment callback timed out');
      if (paymentCallbackValue!.status !== 'Authorized') throw new Error(`Payment callback failed: ${paymentCallbackValue!.status}`);
      await recordCallback(paymentCallbackValue!);
    }
    const delivery = await createDelivery({ ...input, payment_reference: payment.provider_reference });
    if (input.await_callbacks) {
      if (!await condition(() => Boolean(deliveryCallbackValue), '24 hours')) throw new Error('Delivery callback timed out');
      if (deliveryCallbackValue!.status !== 'Ready') throw new Error(`Delivery callback failed: ${deliveryCallbackValue!.status}`);
      await recordCallback(deliveryCallbackValue!);
    }
    return { order_id: input.order_id, payment_state: payment.state, delivery_state: delivery.state };
  } catch (error) {
    await cancelPaymentAndReleaseDelivery({ order_id: input.order_id, reason: String(error) });
    throw error;
  }
}
