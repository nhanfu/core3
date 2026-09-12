import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './ecommerce-activities';

const address = process.env.TEMPORAL_ADDRESS || '127.0.0.1:7233';
const namespace = process.env.TEMPORAL_NAMESPACE || 'default';
const taskQueue = process.env.TEMPORAL_TASK_QUEUE || 'core3-ecommerce';

export async function runEcommerceWorker(): Promise<void> {
  const connection = await NativeConnection.connect({ address });
  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue,
    workflowsPath: new URL('./ecommerce-workflows.ts', import.meta.url).pathname,
    activities,
  });

  console.log(`Core3 Ecommerce Temporal worker listening on ${address} (${taskQueue})`);
  await worker.run();
}

if (import.meta.main) await runEcommerceWorker();
