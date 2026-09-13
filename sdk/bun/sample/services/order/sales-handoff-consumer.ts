export type HandoffService = { call(operation: string, request?: Record<string, unknown>): Promise<any> };

type ConsumerResult = { processed: number; succeeded: number; failed: number };

/** Consumes the eCommerce outbox using only the declared service contracts. */
export class EcommerceSalesHandoffConsumer {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;

  constructor(private readonly ecommerce: HandoffService, private readonly sales: HandoffService) {}

  async pollOnce(): Promise<ConsumerResult> {
    const pending = await this.ecommerce.call('ecommerce.sales.handoffs.pending');
    const handoffs = Array.isArray(pending?.handoffs) ? pending.handoffs : [];
    const result: ConsumerResult = { processed: handoffs.length, succeeded: 0, failed: 0 };
    for (const handoff of handoffs) {
      const ok = await this.consume(handoff);
      if (ok) result.succeeded += 1;
      else result.failed += 1;
    }
    return result;
  }

  start(intervalMs = Number(process.env.CORE3_ECOMMERCE_SALES_HANDOFF_POLL_MS || 5000)): void {
    if (!this.stopped) return;
    this.stopped = false;
    const run = async () => {
      if (this.stopped) return;
      try { await this.pollOnce(); } catch (error) { console.error('[order] eCommerce Sales handoff poll failed:', error); }
      if (!this.stopped) this.timer = setTimeout(run, intervalMs);
    };
    void run();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private async consume(handoff: any): Promise<boolean> {
    let claimed: any;
    try {
      claimed = await this.ecommerce.call('ecommerce.sales.handoff.claim', { values: { id: handoff.id, expected_row_version: handoff.row_version } });
      const orderResponse = await this.ecommerce.call('ecommerce.sales.handoff.order', { handoff_id: handoff.id });
      const order = orderResponse?.order?.[0] || orderResponse?.data?.[0];
      if (!order) throw new Error(`eCommerce order missing for handoff ${handoff.id}`);
      const linesResponse = await this.ecommerce.call('ecommerce.sales.handoff.lines', { handoff_id: handoff.id });
      const lines = linesResponse?.lines || linesResponse?.data || [];
      const existing = await this.sales.call('orders.ecommerce.handoff.order_by_source', { source_service: 'ecommerce', source_id: order.id });
      const salesOrder = existing?.order?.[0] || existing?.data?.[0] || await this.sales.call('orders.ecommerce.handoff.import_order', {
        id: `sales-ecommerce-${order.id}`,
        values: {
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_legal_name: order.customer_email || null,
          order_date: String(order.date_order || '').slice(0, 10),
          total_amount: order.amount_total,
          route: order.shipping_address || null,
          notes: `Imported from eCommerce (${order.id}); ${order.delivery_method || 'delivery'}; ${order.payment_method || 'payment'}`,
          source_service: 'ecommerce',
          source_id: order.id,
        },
      });
      const salesOrderId = salesOrder?.id || salesOrder?.order?.[0]?.id;
      if (!salesOrderId) throw new Error(`Sales order was not created for handoff ${handoff.id}`);
      for (const [index, line] of lines.entries()) {
        const existingLine = await this.sales.call('orders.ecommerce.handoff.line_by_source', { source_line_id: line.id });
        if (existingLine?.line?.[0] || existingLine?.data?.[0]) continue;
        await this.sales.call('orders.ecommerce.handoff.import_line', {
          id: `sales-ecommerce-line-${line.id}`,
          values: { order_id: salesOrderId, sequence: (index + 1) * 10, description: line.product_name, quantity: line.quantity, unit: 'Units', unit_price: line.unit_price, tax_rate: 0, line_total: line.line_total, source_line_id: line.id },
        });
      }
      await this.ecommerce.call('ecommerce.sales.handoff.acknowledge', { values: { id: handoff.id, expected_row_version: claimed.row_version, state: 'Succeeded', sales_order_id: salesOrderId, last_error: null } });
      return true;
    } catch (error) {
      if (claimed?.row_version !== undefined) {
        await this.ecommerce.call('ecommerce.sales.handoff.acknowledge', { values: { id: handoff.id, expected_row_version: claimed.row_version, state: 'Failed', sales_order_id: null, last_error: String(error instanceof Error ? error.message : error).slice(0, 1000) } }).catch(() => {});
      }
      return false;
    }
  }
}
