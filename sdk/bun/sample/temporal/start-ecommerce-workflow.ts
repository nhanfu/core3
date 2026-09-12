import { Connection, WorkflowClient } from '@temporalio/client';
import type { PaymentDeliveryInput } from './ecommerce-workflows';

const address = process.env.TEMPORAL_ADDRESS || '127.0.0.1:7233';
const namespace = process.env.TEMPORAL_NAMESPACE || 'default';
const taskQueue = process.env.TEMPORAL_TASK_QUEUE || 'core3-ecommerce';
const orderId = process.argv[2] || `ecommerce-temporal-${crypto.randomUUID()}`;
const input: PaymentDeliveryInput = { order_id: orderId, payment_method: process.env.TEMPORAL_PAYMENT_METHOD || 'Wire Transfer', delivery_method: 'Standard Delivery', await_callbacks: process.env.TEMPORAL_AWAIT_CALLBACKS === 'true' };

const connection = await Connection.connect({ address });
const client = new WorkflowClient({ connection, namespace });
const handle = await client.start('ecommercePaymentDelivery', {
  taskQueue,
  workflowId: `ecommerce-payment-delivery-${orderId}`,
  args: [input],
});
console.log(JSON.stringify(await handle.result()));
await connection.close();
