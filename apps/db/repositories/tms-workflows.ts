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

export const workflowsMethods = {
  mutateApprovalFlowStep: async function(this: any,
    operation: 'create' | 'update' | 'delete' | 'move_up' | 'move_down',
    flowId: string,
    stepId: string | null,
    values: Record<string, unknown>,
    action: string,
    actor: { id?: string | null; name: string },
  ): Promise<any> {
    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        const [flow] = await queryOnConnection(conn, "SELECT id, code, name FROM system_configs WHERE id = ? AND kind = 'approval_flow'", [flowId]);
        if (!flow) throw { status: 404, message: 'Approval flow not found' };
        if (operation === 'create' || operation === 'update') {
          const name = String(values.name || '').trim();
          const approverRole = String(values.approver_role || '').trim();
          const minAmount = Number(values.min_amount || 0);
          const status = String(values.status || 'Active');
          if (!name || !approverRole) throw { status: 400, message: 'step name and approver role required' };
          if (!Number.isFinite(minAmount) || minAmount < 0) throw { status: 400, message: 'min_amount must be zero or greater' };
          if (!['Active', 'Inactive'].includes(status)) throw { status: 400, message: 'invalid step status' };
          if (operation === 'create') {
            const [last] = await queryOnConnection(conn, 'SELECT COALESCE(MAX(sequence), 0) AS sequence FROM approval_flow_steps WHERE flow_id = ?', [flowId]);
            const id = crypto.randomUUID();
            await runOnConnection(conn, 'INSERT INTO approval_flow_steps(id, flow_id, sequence, name, approver_role, min_amount, status) VALUES(?,?,?,?,?,?,?)', [id, flowId, Number(last?.sequence || 0) + 10, name, approverRole, minAmount, status]);
            await runOnConnection(conn, 'INSERT INTO system_activity(actor_id, actor_name, action, resource, resource_id, detail) VALUES(?,?,?,?,?,?)', [actor.id || null, actor.name, action, 'approval_flow_steps', id, `Thêm bước ${name}`]);
            const [row] = await queryOnConnection(conn, 'SELECT * FROM approval_flow_steps WHERE id = ?', [id]);
            await runOnConnection(conn, 'COMMIT');
            return row;
          }
          if (!stepId) throw { status: 400, message: 'step_id required' };
          const [existing] = await queryOnConnection(conn, 'SELECT * FROM approval_flow_steps WHERE id = ? AND flow_id = ?', [stepId, flowId]);
          if (!existing) throw { status: 404, message: 'Approval step not found' };
          await runOnConnection(conn, 'UPDATE approval_flow_steps SET name = ?, approver_role = ?, min_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND flow_id = ?', [name, approverRole, minAmount, status, stepId, flowId]);
          await runOnConnection(conn, 'INSERT INTO system_activity(actor_id, actor_name, action, resource, resource_id, detail) VALUES(?,?,?,?,?,?)', [actor.id || null, actor.name, action, 'approval_flow_steps', stepId, `Cập nhật bước ${name}`]);
        } else if (operation === 'delete') {
          if (!stepId) throw { status: 400, message: 'step_id required' };
          const [existing] = await queryOnConnection(conn, 'SELECT name FROM approval_flow_steps WHERE id = ? AND flow_id = ?', [stepId, flowId]);
          if (!existing) throw { status: 404, message: 'Approval step not found' };
          await runOnConnection(conn, 'DELETE FROM approval_flow_steps WHERE id = ? AND flow_id = ?', [stepId, flowId]);
          await runOnConnection(conn, 'INSERT INTO system_activity(actor_id, actor_name, action, resource, resource_id, detail) VALUES(?,?,?,?,?,?)', [actor.id || null, actor.name, action, 'approval_flow_steps', stepId, `Xóa bước ${existing.name}`]);
        } else {
          if (!stepId) throw { status: 400, message: 'step_id required' };
          const [current] = await queryOnConnection(conn, 'SELECT id, sequence FROM approval_flow_steps WHERE id = ? AND flow_id = ?', [stepId, flowId]);
          if (!current) throw { status: 404, message: 'Approval step not found' };
          const direction = operation === 'move_up' ? '<' : '>';
          const order = operation === 'move_up' ? 'DESC' : 'ASC';
          const [neighbor] = await queryOnConnection(conn, `SELECT id, sequence FROM approval_flow_steps WHERE flow_id = ? AND sequence ${direction} ? ORDER BY sequence ${order} LIMIT 1`, [flowId, current.sequence]);
          if (neighbor) {
            const [temporary] = await queryOnConnection(conn, 'SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence FROM approval_flow_steps WHERE flow_id = ?', [flowId]);
            await runOnConnection(conn, 'UPDATE approval_flow_steps SET sequence = ? WHERE id = ?', [temporary.sequence, current.id]);
            await runOnConnection(conn, 'UPDATE approval_flow_steps SET sequence = ? WHERE id = ?', [current.sequence, neighbor.id]);
            await runOnConnection(conn, 'UPDATE approval_flow_steps SET sequence = ? WHERE id = ?', [neighbor.sequence, current.id]);
          }
          await runOnConnection(conn, 'INSERT INTO system_activity(actor_id, actor_name, action, resource, resource_id, detail) VALUES(?,?,?,?,?,?)', [actor.id || null, actor.name, action, 'approval_flow_steps', stepId, operation === 'move_up' ? 'Đưa bước lên' : 'Đưa bước xuống']);
        }
        const rows = await queryOnConnection(conn, 'SELECT * FROM approval_flow_steps WHERE flow_id = ? ORDER BY sequence, id', [flowId]);
        await runOnConnection(conn, 'COMMIT');
        return { data: rows };
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK');
        throw error;
      }
    });
  },

  transitionTrip: async function(this: any,
    tripId: string,
    operation: 'start' | 'complete' | 'cancel',
    action: string,
    actor: { id?: string | null; name: string },
  ): Promise<any> {

    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        const [trip] = await queryOnConnection(conn, 'SELECT * FROM trips WHERE id = ?', [tripId]);
        if (!trip) throw { status: 404, message: 'Trip not found' };
        const currentStatus = String(trip.status);
        const transition = operation === 'start'
          ? { from: ['Scheduled'], to: 'In Transit', label: 'start' }
          : operation === 'complete'
            ? { from: ['In Transit'], to: 'Completed', label: 'complete' }
            : { from: ['Scheduled', 'In Transit'], to: 'Cancelled', label: 'cancel' };
        if (!transition.from.includes(currentStatus)) {
          throw { status: 409, message: `Trip cannot ${transition.label} while ${currentStatus}` };
        }
        await runOnConnection(conn, 'UPDATE trips SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [transition.to, tripId]);
        await runOnConnection(conn, 'INSERT INTO system_activity(id, actor_id, actor_name, action, resource, resource_id, detail) VALUES(?,?,?,?,?,?,?)', [crypto.randomUUID(), actor.id || null, actor.name, action, 'trips', tripId, `Trip ${trip.trip_number}: ${currentStatus} -> ${transition.to}`]);
        const [updated] = await queryOnConnection(conn, 'SELECT * FROM trips WHERE id = ?', [tripId]);
        await runOnConnection(conn, 'COMMIT');
        return updated;
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK');
        throw error;
      }
    });
  },

  mutatePrintTemplateBlock: async function(this: any,
    operation: 'create' | 'update' | 'delete' | 'move_up' | 'move_down',
    templateId: string,
    blockId: string | null,
    values: Record<string, unknown>,
    action: string,
    actor: { id?: string | null; name: string },
  ): Promise<any> {
    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        const [template] = await queryOnConnection(conn, "SELECT id, code, name FROM system_configs WHERE id = ? AND kind = 'print_template'", [templateId]);
        if (!template) throw { status: 404, message: 'Print template not found' };
        if (operation === 'create' || operation === 'update') {
          const blockType = String(values.block_type || 'text');
          const label = String(values.label || '').trim();
          const tokenKey = String(values.token_key || '').trim();
          const content = String(values.content || '').trim();
          const status = String(values.status || 'Active');
          const allowedTokenKeys = new Set(['order.order_number', 'order.customer_name', 'order.route', 'order.lines']);
          if (!label) throw { status: 400, message: 'block label required' };
          if (!['text', 'token', 'table', 'spacer'].includes(blockType)) throw { status: 400, message: 'invalid block type' };
          if (blockType === 'token' && !tokenKey) throw { status: 400, message: 'token key required' };
          if (tokenKey && !allowedTokenKeys.has(tokenKey)) throw { status: 400, message: 'invalid token key' };
          if (blockType === 'text' && !content) throw { status: 400, message: 'text content required' };
          if (!['Active', 'Inactive'].includes(status)) throw { status: 400, message: 'invalid block status' };
          if (operation === 'create') {
            const [last] = await queryOnConnection(conn, 'SELECT COALESCE(MAX(sequence), 0) AS sequence FROM print_template_blocks WHERE template_id = ?', [templateId]);
            const id = crypto.randomUUID();
            await runOnConnection(conn, 'INSERT INTO print_template_blocks(id, template_id, sequence, block_type, label, token_key, content, status) VALUES(?,?,?,?,?,?,?,?)', [id, templateId, Number(last?.sequence || 0) + 10, blockType, label, tokenKey || null, content || null, status]);
            await runOnConnection(conn, 'INSERT INTO system_activity(actor_id, actor_name, action, resource, resource_id, detail) VALUES(?,?,?,?,?,?)', [actor.id || null, actor.name, action, 'print_template_blocks', id, `Thêm khối ${label}`]);
            const [row] = await queryOnConnection(conn, 'SELECT * FROM print_template_blocks WHERE id = ?', [id]);
            await runOnConnection(conn, 'COMMIT');
            return row;
          }
          if (!blockId) throw { status: 400, message: 'block_id required' };
          const [existing] = await queryOnConnection(conn, 'SELECT id FROM print_template_blocks WHERE id = ? AND template_id = ?', [blockId, templateId]);
          if (!existing) throw { status: 404, message: 'Print block not found' };
          await runOnConnection(conn, 'UPDATE print_template_blocks SET block_type = ?, label = ?, token_key = ?, content = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND template_id = ?', [blockType, label, tokenKey || null, content || null, status, blockId, templateId]);
          await runOnConnection(conn, 'INSERT INTO system_activity(actor_id, actor_name, action, resource, resource_id, detail) VALUES(?,?,?,?,?,?)', [actor.id || null, actor.name, action, 'print_template_blocks', blockId, `Cập nhật khối ${label}`]);
        } else if (operation === 'delete') {
          if (!blockId) throw { status: 400, message: 'block_id required' };
          const [existing] = await queryOnConnection(conn, 'SELECT label FROM print_template_blocks WHERE id = ? AND template_id = ?', [blockId, templateId]);
          if (!existing) throw { status: 404, message: 'Print block not found' };
          await runOnConnection(conn, 'DELETE FROM print_template_blocks WHERE id = ? AND template_id = ?', [blockId, templateId]);
          await runOnConnection(conn, 'INSERT INTO system_activity(actor_id, actor_name, action, resource, resource_id, detail) VALUES(?,?,?,?,?,?)', [actor.id || null, actor.name, action, 'print_template_blocks', blockId, `Xóa khối ${existing.label}`]);
        } else {
          if (!blockId) throw { status: 400, message: 'block_id required' };
          const [current] = await queryOnConnection(conn, 'SELECT id, sequence FROM print_template_blocks WHERE id = ? AND template_id = ?', [blockId, templateId]);
          if (!current) throw { status: 404, message: 'Print block not found' };
          const direction = operation === 'move_up' ? '<' : '>';
          const order = operation === 'move_up' ? 'DESC' : 'ASC';
          const [neighbor] = await queryOnConnection(conn, `SELECT id, sequence FROM print_template_blocks WHERE template_id = ? AND sequence ${direction} ? ORDER BY sequence ${order} LIMIT 1`, [templateId, current.sequence]);
          if (neighbor) {
            const [temporary] = await queryOnConnection(conn, 'SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence FROM print_template_blocks WHERE template_id = ?', [templateId]);
            await runOnConnection(conn, 'UPDATE print_template_blocks SET sequence = ? WHERE id = ?', [temporary.sequence, current.id]);
            await runOnConnection(conn, 'UPDATE print_template_blocks SET sequence = ? WHERE id = ?', [current.sequence, neighbor.id]);
            await runOnConnection(conn, 'UPDATE print_template_blocks SET sequence = ? WHERE id = ?', [neighbor.sequence, current.id]);
          }
          await runOnConnection(conn, 'INSERT INTO system_activity(actor_id, actor_name, action, resource, resource_id, detail) VALUES(?,?,?,?,?,?)', [actor.id || null, actor.name, action, 'print_template_blocks', blockId, operation === 'move_up' ? 'Đưa khối lên' : 'Đưa khối xuống']);
        }
        const rows = await queryOnConnection(conn, 'SELECT * FROM print_template_blocks WHERE template_id = ? ORDER BY sequence, id', [templateId]);
        await runOnConnection(conn, 'COMMIT');
        return { data: rows };
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK');
        throw error;
      }
    });
  },

  transitionOrder: async function(this: any,
    orderId: string,
    allowedFrom: readonly string[],
    targetStatus: string,
    action: string,
    actor: { id?: string | null; name: string },
  ): Promise<any> {
    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        const rows = await queryOnConnection(
          conn,
          `SELECT o.*, COALESCE(s.status, o.status) AS workflow_status
           FROM orders o
           LEFT JOIN order_workflow_states s ON s.order_id = o.id
           WHERE o.id = ?`,
          [orderId],
        );
        const order = rows[0];
        if (!order) throw { status: 404, message: 'Order not found' };
        if (!allowedFrom.includes(order.workflow_status)) {
          throw {
            status: 409,
            message: `Action "${action}" is not allowed while order is "${order.workflow_status}"`,
          };
        }
        await runOnConnection(
          conn,
           `INSERT INTO order_workflow_states(order_id, status, updated_at)
           VALUES(?,?,?)
           ON CONFLICT(order_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
          [orderId, targetStatus, new Date()],
        );
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
            'orders',
            orderId,
            `${order.order_number}: ${order.workflow_status} -> ${targetStatus}`,
          ],
        );
        const [updated] = await queryOnConnection(
          conn,
          `SELECT o.*, COALESCE(s.status, o.status) AS status
           FROM orders o
           LEFT JOIN order_workflow_states s ON s.order_id = o.id
           WHERE o.id = ?`,
          [orderId],
        );
        await runOnConnection(conn, 'COMMIT');
        return { ...updated, previous_status: order.workflow_status };
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK').catch(() => {});
        throw error;
      }
    });
  },

  transitionAccountingEntry: async function(this: any,
    entryId: string,
    kind: string,
    allowedFrom: readonly string[],
    targetStatus: string,
    action: string,
    actor: { id?: string | null; name: string },
  ): Promise<any> {
    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        const rows = await queryOnConnection(
          conn,
          'SELECT * FROM accounting_entries WHERE id = ? AND kind = ?',
          [entryId, kind],
        );
        const entry = rows[0];
        if (!entry) throw { status: 404, message: 'Financial document not found' };
        if (!allowedFrom.includes(entry.status)) {
          throw {
            status: 409,
            message: `Action "${action}" is not allowed while document is "${entry.status}"`,
          };
        }

        await runOnConnection(
          conn,
          `UPDATE accounting_entries
           SET status = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND kind = ? AND status = ?`,
          [targetStatus, entryId, kind, entry.status],
        );
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
            'accounting_entries',
            entryId,
            `${kind}:${entry.code}: ${entry.status} -> ${targetStatus}`,
          ],
        );
        const [updated] = await queryOnConnection(
          conn,
          'SELECT * FROM accounting_entries WHERE id = ? AND kind = ?',
          [entryId, kind],
        );
        await runOnConnection(conn, 'COMMIT');
        return { ...updated, previous_status: entry.status };
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK').catch(() => {});
        throw error;
      }
    });
  },

  transitionBusinessRecord: async function(this: any,
    config: {
      table: 'quotes' | 'payrolls';
      label: string;
    },
    recordId: string,
    allowedFrom: readonly string[],
    targetStatus: string,
    action: string,
    actor: { id?: string | null; name: string },
  ): Promise<any> {
    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        const rows = await queryOnConnection(
          conn,
          `SELECT * FROM ${config.table} WHERE id = ?`,
          [recordId],
        );
        const record = rows[0];
        if (!record) throw { status: 404, message: `${config.label} not found` };
        if (!allowedFrom.includes(record.status)) {
          throw {
            status: 409,
            message: `Action "${action}" is not allowed while ${config.label.toLowerCase()} is "${record.status}"`,
          };
        }

        await runOnConnection(
          conn,
          `UPDATE ${config.table}
           SET status = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND status = ?`,
          [targetStatus, recordId, record.status],
        );
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
            config.table,
            recordId,
            `${record.code}: ${record.status} -> ${targetStatus}`,
          ],
        );
        const [updated] = await queryOnConnection(
          conn,
          `SELECT * FROM ${config.table} WHERE id = ?`,
          [recordId],
        );
        await runOnConnection(conn, 'COMMIT');
        return { ...updated, previous_status: record.status };
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK').catch(() => {});
        throw error;
      }
    });
  },
};

