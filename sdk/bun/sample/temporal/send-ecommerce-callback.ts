import { Connection, WorkflowClient } from '@temporalio/client';
import { paymentCallback, deliveryCallback } from './ecommerce-workflows';

const address = process.env.TEMPORAL_ADDRESS || '127.0.0.1:7233';
const namespace = process.env.TEMPORAL_NAMESPACE || 'default';
const orderId = process.argv[2];
const kind = process.argv[3] || 'payment';
if (!orderId) throw new Error('Usage: bun temporal/send-ecommerce-callback.ts <order-id> <payment|delivery> [status]');
const status = process.argv[4] || (kind === 'payment' ? 'Authorized' : 'Ready');
const connection = await Connection.connect({ address });
const client = new WorkflowClient({ connection, namespace });
const handle = client.getHandle(`ecommerce-payment-delivery-${orderId}`);
await handle.signal(kind === 'payment' ? paymentCallback : deliveryCallback, { callback_id: `${kind}-${orderId}`, order_id: orderId, status });
console.log(JSON.stringify({ signalled: true, order_id: orderId, kind, status }));
await connection.close();
