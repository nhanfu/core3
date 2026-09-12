import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from './ecommerce-activities';

export type PaymentDeliveryInput = {
  order_id: string;
  payment_method: string;
  delivery_method: string;
  customer_email?: string;
};

export type PaymentDeliveryResult = {
  order_id: string;
  payment_state: string;
  delivery_state: string;
};

const { authorizePayment, createDelivery, cancelPaymentAndReleaseDelivery } = proxyActivities<typeof activities>({
  startToCloseTimeout: '15 minutes',
  retry: { maximumAttempts: 5, backoffCoefficient: 2 },
});

export async function ecommercePaymentDelivery(input: PaymentDeliveryInput): Promise<PaymentDeliveryResult> {
  try {
    // Keep a deterministic timer in the workflow so worker restart recovery is
    // exercised before external side effects begin.
    await sleep('2 seconds');
    const payment = await authorizePayment(input);
    const delivery = await createDelivery({ ...input, payment_reference: payment.provider_reference });
    return { order_id: input.order_id, payment_state: payment.state, delivery_state: delivery.state };
  } catch (error) {
    await cancelPaymentAndReleaseDelivery({ order_id: input.order_id, reason: String(error) });
    throw error;
  }
}
