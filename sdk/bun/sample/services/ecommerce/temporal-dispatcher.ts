import { Connection, WorkflowClient } from '@temporalio/client';
import type { EventBus, EventEnvelope } from '@core3/med';

type DispatcherEvent = EventEnvelope & { message?: Record<string, unknown>; payload?: { message?: Record<string, unknown> } };

/** Bridges the durable Core3 checkout event stream to the Temporal workflow. */
export class EcommerceTemporalDispatcher {
  private connection: Connection | null = null;
  private client: WorkflowClient | null = null;
  private subscription: { events: AsyncIterable<EventEnvelope>; close: () => void } | null = null;
  private loop: Promise<void> | null = null;

  async start(eventBus: EventBus, address = process.env.TEMPORAL_ADDRESS): Promise<void> {
    if (!address || this.loop) return;
    this.connection = await Connection.connect({ address });
    this.client = new WorkflowClient({ connection: this.connection, namespace: process.env.TEMPORAL_NAMESPACE || 'default' });
    this.subscription = eventBus.subscribeStream({ topic: 'ecommerce.checkout.confirmed', group: 'temporal-ecommerce-checkout' });
    this.loop = this.consume(this.subscription.events);
  }

  private async consume(events: AsyncIterable<EventEnvelope>): Promise<void> {
    for await (const raw of events) {
      const event = raw as DispatcherEvent;
      const message = event.message || event.payload?.message || {};
      const orderId = String(message.id || event.messageId || '');
      if (!orderId || !this.client) continue;
      await this.client.start('ecommercePaymentDelivery', {
        taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'core3-ecommerce',
        workflowId: `ecommerce-payment-delivery-${orderId}`,
        args: [{ order_id: orderId, payment_method: message.payment_method || 'Wire Transfer', delivery_method: message.delivery_method || 'Standard Delivery', customer_email: message.customer_email }],
      }).catch(error => console.error(`[ecommerce] Temporal checkout dispatch failed for ${orderId}:`, error));
    }
  }

  async stop(): Promise<void> {
    this.subscription?.close();
    this.subscription = null;
    await this.connection?.close();
    this.connection = null;
    this.client = null;
    this.loop = null;
  }
}
