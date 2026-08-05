import {
  type Change,
  bindNamedParams,
  describeQueryError,
  normalizeContactValues,
  normalizeLineValues,
  queryOnConnection,
  redactQueryValue,
  runOnConnection,
  splitSQL,
} from './tms-shared.ts';

export const documentLinesMethods = {
  mutateDocumentLine: async function(this: any,
    config: {
      parentTable: 'orders' | 'quotes' | 'accounting_entries';
      lineTable: 'order_lines' | 'quote_lines' | 'accounting_entry_lines';
      parentKey: 'order_id' | 'quote_id' | 'entry_id';
      label: 'Order' | 'Quote' | 'Financial document';
      hasCost: boolean;
      totalField: 'total_amount' | 'amount';
    },
    operation: 'create' | 'update' | 'delete',
    parentId: string,
    lineId: string | null,
    values: Record<string, unknown>,
    action: string,
    actor: { id?: string | null; name: string },
  ): Promise<any> {
    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        const [parent] = await queryOnConnection(
          conn,
          config.parentTable === 'orders'
            ? `SELECT o.*, COALESCE(s.status, o.status) AS workflow_status
               FROM orders o LEFT JOIN order_workflow_states s ON s.order_id = o.id
               WHERE o.id = ?`
            : `SELECT * FROM ${config.parentTable} WHERE id = ?`,
          [parentId],
        );
        if (!parent) throw { status: 404, message: `${config.label} not found` };
        const parentStatus = config.parentTable === 'orders' ? parent.workflow_status : parent.status;
        if (parentStatus !== 'Draft') {
          throw {
            status: 409,
            message: `${config.label} lines cannot be changed while ${parentStatus}`,
          };
        }

        let line: any = null;
        if (operation === 'delete') {
          if (!lineId) throw { status: 400, message: 'line_id required' };
          [line] = await queryOnConnection(
            conn,
            `SELECT * FROM ${config.lineTable} WHERE id = ? AND ${config.parentKey} = ?`,
            [lineId, parentId],
          );
          if (!line) throw { status: 404, message: 'Line item not found' };
          await runOnConnection(
            conn,
            `DELETE FROM ${config.lineTable} WHERE id = ? AND ${config.parentKey} = ?`,
            [lineId, parentId],
          );
        } else {
          const normalized = normalizeLineValues(values, config.hasCost);
          if (operation === 'create') {
            const [sequenceRow] = await queryOnConnection(
              conn,
              `SELECT COALESCE(MAX(sequence), 0) + 10 AS next_sequence
               FROM ${config.lineTable} WHERE ${config.parentKey} = ?`,
              [parentId],
            );
            lineId = crypto.randomUUID();
            const columns = [
              'id', config.parentKey, 'sequence', 'description', 'quantity',
              'unit', 'unit_price',
              ...(config.hasCost ? ['cost_price'] : []),
              'tax_rate', 'line_total',
              ...(config.hasCost ? ['cost_total'] : []),
            ];
            const params = [
              lineId,
              parentId,
              Number(sequenceRow?.next_sequence || 10),
              normalized.description,
              normalized.quantity,
              normalized.unit,
              normalized.unitPrice,
              ...(config.hasCost ? [normalized.costPrice] : []),
              normalized.taxRate,
              normalized.lineTotal,
              ...(config.hasCost ? [normalized.costTotal] : []),
            ];
            await runOnConnection(
              conn,
              `INSERT INTO ${config.lineTable}(${columns.join(', ')})
               VALUES(${columns.map(() => '?').join(', ')})`,
              params,
            );
          } else {
            if (!lineId) throw { status: 400, message: 'line_id required' };
            const [existingLine] = await queryOnConnection(
              conn,
              `SELECT id FROM ${config.lineTable} WHERE id = ? AND ${config.parentKey} = ?`,
              [lineId, parentId],
            );
            if (!existingLine) throw { status: 404, message: 'Line item not found' };
            const assignments = [
              'description = ?', 'quantity = ?', 'unit = ?', 'unit_price = ?',
              ...(config.hasCost ? ['cost_price = ?'] : []),
              'tax_rate = ?', 'line_total = ?',
              ...(config.hasCost ? ['cost_total = ?'] : []),
              'updated_at = CURRENT_TIMESTAMP',
            ];
            const params = [
              normalized.description,
              normalized.quantity,
              normalized.unit,
              normalized.unitPrice,
              ...(config.hasCost ? [normalized.costPrice] : []),
              normalized.taxRate,
              normalized.lineTotal,
              ...(config.hasCost ? [normalized.costTotal] : []),
              lineId,
              parentId,

            ];
            await runOnConnection(
              conn,
              `UPDATE ${config.lineTable} SET ${assignments.join(', ')}
               WHERE id = ? AND ${config.parentKey} = ?`,
              params,
            );
          }
          [line] = await queryOnConnection(
            conn,
            `SELECT * FROM ${config.lineTable} WHERE id = ? AND ${config.parentKey} = ?`,
            [lineId, parentId],
          );
        }

        const [totals] = await queryOnConnection(
          conn,
          `SELECT COALESCE(SUM(line_total), 0) AS amount
            ${config.hasCost ? ', COALESCE(SUM(cost_total), 0) AS cost_amount' : ''}
           FROM ${config.lineTable} WHERE ${config.parentKey} = ?`,
          [parentId],
        );
        if (config.hasCost) {
          const amount = Number(totals.amount || 0);
          const costAmount = Number(totals.cost_amount || 0);
          await runOnConnection(
            conn,
            `UPDATE quotes SET amount = ?, cost_amount = ?, profit_amount = ?,
             updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [amount, costAmount, amount - costAmount, parentId],
          );
        } else {
          if (config.parentTable === 'orders') {
            const currentLines = await queryOnConnection(
              conn,
              'SELECT id, order_id, sequence, description, quantity, unit, unit_price, tax_rate, line_total, created_at, updated_at FROM order_lines WHERE order_id = ? ORDER BY sequence, id',
              [parentId],
            );
            const [workflowState] = await queryOnConnection(
              conn,
              'SELECT order_id, status, updated_at FROM order_workflow_states WHERE order_id = ?',
              [parentId],
            );
            await runOnConnection(conn, 'DELETE FROM order_lines WHERE order_id = ?', [parentId]);
            if (workflowState) await runOnConnection(conn, 'DELETE FROM order_workflow_states WHERE order_id = ?', [parentId]);
            await runOnConnection(
              conn,
              'UPDATE orders SET total_amount = ?, updated_at = ? WHERE id = ?',
              [Number(totals.amount || 0), new Date(), parentId],
            );
            if (workflowState) {
              await runOnConnection(
                conn,
                'INSERT INTO order_workflow_states(order_id, status, updated_at) VALUES(?,?,?)',
                [workflowState.order_id, workflowState.status, workflowState.updated_at],
              );
            }
            for (const currentLine of currentLines) {
              await runOnConnection(
                conn,
                `INSERT INTO order_lines(
                  id, order_id, sequence, description, quantity, unit, unit_price,
                  tax_rate, line_total, created_at, updated_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
                [currentLine.id, currentLine.order_id, currentLine.sequence, currentLine.description, currentLine.quantity, currentLine.unit, currentLine.unit_price, currentLine.tax_rate, currentLine.line_total, currentLine.created_at, currentLine.updated_at],
              );
            }
          } else {
            await runOnConnection(
              conn,
              `UPDATE ${config.parentTable}
               SET ${config.totalField} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [Number(totals.amount || 0), parentId],
            );
          }
        }

        await runOnConnection(
          conn,
          `INSERT INTO system_activity(
            id, actor_id, actor_name, action, resource, resource_id, detail
          ) VALUES(?,?,?,?,?,?,?)`,
          [
            crypto.randomUUID(),
            actor.id || null,
            actor.name,
            action,
            config.parentTable,
            parentId,
            `${parent.code || parent.order_number}: ${operation} line ${line?.description || ''}`.trim(),
          ],
        );
        await runOnConnection(conn, 'COMMIT');
        return {
          line: operation === 'delete' ? null : line,
          totals: config.hasCost
            ? {
                amount: Number(totals.amount || 0),
                cost_amount: Number(totals.cost_amount || 0),
                profit_amount: Number(totals.amount || 0) - Number(totals.cost_amount || 0),
              }
            : { [config.totalField]: Number(totals.amount || 0) },
        };
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK').catch(() => {});
        throw error;
      }
    });
  },
};

