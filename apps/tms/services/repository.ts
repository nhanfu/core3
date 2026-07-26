type Change = { field: string; value: any };
type TranslationEntry = {
  lang: string;
  page: string;
  component?: string | null;
  text: string;
  translated: string;
};

function normalizeLineValues(values: Record<string, unknown>, hasCost: boolean) {
  const description = String(values.description || '').trim();
  const unit = String(values.unit || '').trim() || 'Chuyến';
  const quantity = Number(values.quantity);
  const unitPrice = Number(values.unit_price);
  const costPrice = hasCost ? Number(values.cost_price) : 0;
  const taxRate = Number(values.tax_rate || 0);
  if (!description) throw { status: 400, message: 'description required' };
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw { status: 400, message: 'quantity must be greater than zero' };
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw { status: 400, message: 'unit_price must be zero or greater' };
  }
  if (hasCost && (!Number.isFinite(costPrice) || costPrice < 0)) {
    throw { status: 400, message: 'cost_price must be zero or greater' };
  }
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
    throw { status: 400, message: 'tax_rate must be between zero and 100' };
  }
  return {
    description,
    unit,
    quantity,
    unitPrice,
    costPrice,
    taxRate,
    lineTotal: Math.round(quantity * unitPrice * (1 + taxRate / 100) * 100) / 100,
    costTotal: Math.round(quantity * costPrice * 100) / 100,
  };
}

export class DuckDbRepository {
  db: any;

  constructor(db: any) {
    this.db = db;
  }

  async withConnection<T>(fn: (conn: any) => Promise<T> | T): Promise<T> {
    const conn = this.db.connect();
    try {
      return await fn(conn);
    } finally {
      await new Promise<void>((resolve) => conn.close(() => resolve()));
    }
  }

  run(sql: string, params: any[] = []): Promise<void> {
    return this.withConnection((conn) => runOnConnection(conn, sql, params));
  }

  query(sql: string, params: any[] = []): Promise<any[]> {
    return this.withConnection((conn) => queryOnConnection(conn, sql, params));
  }

  async runStatements(sqlText: string): Promise<void> {
    for (const stmt of splitSQL(sqlText)) {
      await this.run(stmt);
    }
  }

  async countRows(table: string): Promise<number> {
    const rows = await this.query(`SELECT COUNT(*) AS n FROM ${table}`);
    return Number(rows[0]?.n || 0);
  }

  async getLoginUserByEmail(email: string): Promise<any | null> {
    const rows = await this.query(
      `SELECT u.*, string_agg(r.name, ',') as roles_csv
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.email = ?
       GROUP BY u.id, u.email, u.name, u.password_hash, u.avatar_url,
                u.preferred_lang, u.created_at, u.updated_at`,
      [email]
    );
    return rows[0] || null;
  }

  async refreshUserPasswordHash(userId: any, hash: string): Promise<void> {
    await this.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
  }

  async getUserPermissions(userId: any): Promise<string[]> {
    const perms = await this.query(
      `SELECT DISTINCT p.permission_key
       FROM permissions p
       JOIN roles r ON r.id = p.role_id
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [userId]
    );
    return perms.map((p: any) => p.permission_key);
  }

  async querySource(source: { query: string; single?: boolean }, params: Record<string, any> = {}, skip = 0, top = 25): Promise<any> {
    const { statement, values } = bindNamedParams(source.query, params);
    if (source.single) {
      const rows = await this.query(statement, values);
      return { data: rows[0] || {} };
    }

    const [count] = await this.query(`SELECT COUNT(*) AS n FROM (${statement}) AS source_rows`, values);
    const pageSize = Math.max(1, Math.min(Number(top) || 25, 100));
    const offset = Math.max(0, Number(skip) || 0);
    const rows = await this.query(
      `SELECT * FROM (${statement}) AS source_rows LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );
    const total = Number(count?.n || 0);
    return {
      data: rows,
      meta: { total, page: Math.floor(offset / pageSize) + 1, pageSize, pages: Math.ceil(total / pageSize) },
    };
  }

  async createRecord(table: string, changes: Change[]): Promise<any> {
    const newId = crypto.randomUUID();
    const cols = ['id', ...changes.map((c) => c.field)].join(', ');
    const vals = [newId, ...changes.map((c) => c.value)];
    await this.run(
      `INSERT INTO ${table}(${cols}) VALUES(${vals.map(() => '?').join(', ')})`,
      vals
    );
    const rows = await this.query(`SELECT * FROM ${table} WHERE id = ?`, [newId]);
    return rows[0] || null;
  }

  async updateRecord(table: string, id: any, changes: Change[], timestamps: boolean): Promise<any> {
    const sets = changes.map((c) => `${c.field} = ?`).join(', ');
    const tsClause = timestamps ? ', updated_at = CURRENT_TIMESTAMP' : '';
    await this.run(
      `UPDATE ${table} SET ${sets}${tsClause} WHERE id = ?`,
      [...changes.map((c) => c.value), id]
    );
    const rows = await this.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return rows[0] || null;
  }

  async deleteRecord(table: string, id: any): Promise<void> {
    if (table !== 'orders' && table !== 'quotes' && table !== 'accounting_entries') {
      await this.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
      return;
    }
    await this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        await runOnConnection(
          conn,
          `DELETE FROM ${
            table === 'orders'
              ? 'order_lines'
              : table === 'quotes'
                ? 'quote_lines'
                : 'accounting_entry_lines'
          }
           WHERE ${
             table === 'orders'
               ? 'order_id'
               : table === 'quotes'
                 ? 'quote_id'
                 : 'entry_id'
           } = ?`,
          [id],
        );
        await runOnConnection(conn, `DELETE FROM ${table} WHERE id = ?`, [id]);
        await runOnConnection(conn, 'COMMIT');
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK').catch(() => {});
        throw error;
      }
    });
  }

  async recordActivity(event: {
    actorId?: string | null;
    actorName: string;
    action: string;
    resource: string;
    resourceId?: string | null;
    detail?: string | null;
  }): Promise<void> {
    await this.run(
      `INSERT INTO system_activity(
        id, actor_id, actor_name, action, resource, resource_id, detail
      ) VALUES(?,?,?,?,?,?,?)`,
      [
        crypto.randomUUID(),
        event.actorId || null,
        event.actorName,
        event.action,
        event.resource,
        event.resourceId || null,
        event.detail || null,
      ],
    );
  }

  async createChatThread(
    values: Record<string, unknown>,
    actor: { id?: string | null; name: string },
  ): Promise<any> {
    const actorId = String(actor.id || '');
    const title = String(values.title || '').trim();
    const requestedEmails = [...new Set(
      String(values.participant_emails || '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    )];
    if (!actorId) throw { status: 401, message: 'Authenticated user required' };
    if (!title) throw { status: 400, message: 'title required' };
    if (title.length > 160) throw { status: 400, message: 'title must be 160 characters or fewer' };

    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        const users = requestedEmails.length
          ? await queryOnConnection(
              conn,
              `SELECT id, lower(email) AS email
               FROM users
               WHERE lower(email) IN (${requestedEmails.map(() => '?').join(', ')})`,
              requestedEmails,
            )
          : [];
        const foundEmails = new Set(users.map((user: any) => user.email));
        const unknownEmails = requestedEmails.filter((email) => !foundEmails.has(email));
        if (unknownEmails.length) {
          throw {
            status: 400,
            message: `Unknown participant email: ${unknownEmails.join(', ')}`,
          };
        }

        const participantIds = [...new Set([actorId, ...users.map((user: any) => String(user.id))])];
        const threadId = crypto.randomUUID();
        await runOnConnection(
          conn,
          `INSERT INTO chat_threads(id, title, thread_type, created_by)
           VALUES(?,?,?,?)`,
          [threadId, title, participantIds.length === 2 ? 'Direct' : 'Group', actorId],
        );
        for (const userId of participantIds) {
          await runOnConnection(
            conn,
            `INSERT INTO chat_participants(thread_id, user_id, last_read_at)
             VALUES(?,?,CURRENT_TIMESTAMP)`,
            [threadId, userId],
          );
        }
        await runOnConnection(
          conn,
          `INSERT INTO system_activity(
            id, actor_id, actor_name, action, resource, resource_id, detail
          ) VALUES(?,?,?,?,?,?,?)`,
          [
            crypto.randomUUID(),
            actorId,
            actor.name,
            'chat.threads.create',
            'chat_threads',
            threadId,
            `Created chat thread ${title}`,
          ],
        );
        await runOnConnection(conn, 'COMMIT');
        return {
          id: threadId,
          title,
          thread_type: participantIds.length === 2 ? 'Direct' : 'Group',
          participant_count: participantIds.length,
        };
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK').catch(() => {});
        throw error;
      }
    });
  }

  async sendChatMessage(
    threadId: string,
    content: unknown,
    actor: { id?: string | null; name: string },
  ): Promise<any> {
    const actorId = String(actor.id || '');
    const body = String(content || '').trim();
    if (!actorId) throw { status: 401, message: 'Authenticated user required' };
    if (!body) throw { status: 400, message: 'message content required' };
    if (body.length > 4000) {
      throw { status: 400, message: 'message content must be 4000 characters or fewer' };
    }

    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        const [thread] = await queryOnConnection(
          conn,
          `SELECT t.id, t.title
           FROM chat_threads t
           JOIN chat_participants p ON p.thread_id = t.id
           WHERE t.id = ? AND p.user_id = ?`,
          [threadId, actorId],
        );
        if (!thread) throw { status: 404, message: 'Chat thread not found' };

        const messageId = crypto.randomUUID();
        await runOnConnection(
          conn,
          `INSERT INTO chat_messages(id, thread_id, sender_id, body)
           VALUES(?,?,?,?)`,
          [messageId, threadId, actorId, body],
        );
        await runOnConnection(
          conn,
          'UPDATE chat_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [threadId],
        );
        await runOnConnection(
          conn,
          `UPDATE chat_participants
           SET last_read_at = CURRENT_TIMESTAMP
           WHERE thread_id = ? AND user_id = ?`,
          [threadId, actorId],
        );
        await runOnConnection(
          conn,
          `INSERT INTO system_activity(
            id, actor_id, actor_name, action, resource, resource_id, detail
          ) VALUES(?,?,?,?,?,?,?)`,
          [
            crypto.randomUUID(),
            actorId,
            actor.name,
            'chat.messages.send',
            'chat_threads',
            threadId,
            `Sent message in ${thread.title}`,
          ],
        );
        await runOnConnection(conn, 'COMMIT');
        return {
          id: messageId,
          thread_id: threadId,
          sender_id: actorId,
          body,
        };
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK').catch(() => {});
        throw error;
      }
    });
  }

  async sendChatAttachment(
    threadId: string,
    content: unknown,
    attachment: {
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      storageKey: string;
    },
    actor: { id?: string | null; name: string },
  ): Promise<any> {
    const actorId = String(actor.id || '');
    const body = String(content || '').trim() || `Đã gửi tệp ${attachment.fileName}`;
    if (!actorId) throw { status: 401, message: 'Authenticated user required' };
    if (body.length > 4000) {
      throw { status: 400, message: 'message content must be 4000 characters or fewer' };
    }

    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        const [thread] = await queryOnConnection(
          conn,
          `SELECT t.id, t.title
           FROM chat_threads t
           JOIN chat_participants p ON p.thread_id = t.id
           WHERE t.id = ? AND p.user_id = ?`,
          [threadId, actorId],
        );
        if (!thread) throw { status: 404, message: 'Chat thread not found' };

        const messageId = crypto.randomUUID();
        const attachmentId = crypto.randomUUID();
        await runOnConnection(
          conn,
          `INSERT INTO chat_messages(id, thread_id, sender_id, body)
           VALUES(?,?,?,?)`,
          [messageId, threadId, actorId, body],
        );
        await runOnConnection(
          conn,
          `INSERT INTO chat_attachments(
            id, message_id, file_name, mime_type, size_bytes, storage_key
          ) VALUES(?,?,?,?,?,?)`,
          [
            attachmentId,
            messageId,
            attachment.fileName,
            attachment.mimeType,
            attachment.sizeBytes,
            attachment.storageKey,
          ],
        );
        await runOnConnection(
          conn,
          'UPDATE chat_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [threadId],
        );
        await runOnConnection(
          conn,
          `UPDATE chat_participants
           SET last_read_at = CURRENT_TIMESTAMP
           WHERE thread_id = ? AND user_id = ?`,
          [threadId, actorId],
        );
        await runOnConnection(
          conn,
          `INSERT INTO system_activity(
            id, actor_id, actor_name, action, resource, resource_id, detail
          ) VALUES(?,?,?,?,?,?,?)`,
          [
            crypto.randomUUID(),
            actorId,
            actor.name,
            'chat.attachments.upload',
            'chat_threads',
            threadId,
            `Uploaded ${attachment.fileName} in ${thread.title}`,
          ],
        );
        await runOnConnection(conn, 'COMMIT');
        return {
          id: attachmentId,
          message_id: messageId,
          thread_id: threadId,
          file_name: attachment.fileName,
        };
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK').catch(() => {});
        throw error;
      }
    });
  }

  async getChatAttachment(attachmentId: string, userId: string): Promise<any | null> {
    const rows = await this.query(
      `SELECT a.id, a.file_name, a.mime_type, a.size_bytes, a.storage_key
       FROM chat_attachments a
       JOIN chat_messages m ON m.id = a.message_id
       JOIN chat_participants p ON p.thread_id = m.thread_id
       WHERE a.id = ? AND p.user_id = ?`,
      [attachmentId, userId],
    );
    return rows[0] || null;
  }

  async markChatThreadRead(threadId: string, userId: string): Promise<{ ok: true }> {
    const participants = await this.query(
      'SELECT thread_id FROM chat_participants WHERE thread_id = ? AND user_id = ?',
      [threadId, userId],
    );
    if (!participants[0]) throw { status: 404, message: 'Chat thread not found' };
    await this.run(
      `UPDATE chat_participants
       SET last_read_at = CURRENT_TIMESTAMP
       WHERE thread_id = ? AND user_id = ?`,
      [threadId, userId],
    );
    return { ok: true };
  }

  async transitionOrder(
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
          'SELECT * FROM orders WHERE id = ?',
          [orderId],
        );
        const order = rows[0];
        if (!order) throw { status: 404, message: 'Order not found' };
        if (!allowedFrom.includes(order.status)) {
          throw {
            status: 409,
            message: `Action "${action}" is not allowed while order is "${order.status}"`,
          };
        }

        await runOnConnection(
          conn,
          'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = ?',
          [targetStatus, orderId, order.status],
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
            `${order.order_number}: ${order.status} -> ${targetStatus}`,
          ],
        );
        const [updated] = await queryOnConnection(
          conn,
          'SELECT * FROM orders WHERE id = ?',
          [orderId],
        );
        await runOnConnection(conn, 'COMMIT');
        return { ...updated, previous_status: order.status };
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK').catch(() => {});
        throw error;
      }
    });
  }

  async transitionAccountingEntry(
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
  }

  async transitionBusinessRecord(
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
  }

  async mutateDocumentLine(
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
          `SELECT * FROM ${config.parentTable} WHERE id = ?`,
          [parentId],
        );
        if (!parent) throw { status: 404, message: `${config.label} not found` };
        if (parent.status !== 'Draft') {
          throw {
            status: 409,
            message: `${config.label} lines cannot be changed while ${parent.status}`,
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
          await runOnConnection(
            conn,
            `UPDATE ${config.parentTable}
             SET ${config.totalField} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [Number(totals.amount || 0), parentId],
          );
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
  }

  async deleteUserRoles(userId: any): Promise<void> {
    await this.run('DELETE FROM user_roles WHERE user_id = ?', [userId]);
  }

  async createUser(changes: Change[]): Promise<any> {
    const rolesChange = changes.find((c) => c.field === 'roles');
    const passwordChange = changes.find((c) => c.field === 'password');
    let regularChanges = changes.filter((c) => c.field !== 'roles' && c.field !== 'password');
    const newId = crypto.randomUUID();

    if (passwordChange) {
      const hash = await Bun.password.hash(passwordChange.value);
      regularChanges = [...regularChanges, { field: 'password_hash', value: hash }];
    }

    const cols = ['id', ...regularChanges.map((c) => c.field)].join(', ');
    const vals = [newId, ...regularChanges.map((c) => c.value)];
    await this.run(
      `INSERT INTO users(${cols}) VALUES(${vals.map(() => '?').join(', ')})`,
      vals
    );

    if (rolesChange) {
      const roleNames = Array.isArray(rolesChange.value)
        ? rolesChange.value
        : String(rolesChange.value).split(',').filter(Boolean);
      for (const roleName of roleNames) {
        const roleRows = await this.query('SELECT id FROM roles WHERE name = ?', [roleName.trim()]);
        if (roleRows[0]) {
          await this.run('INSERT INTO user_roles(user_id, role_id) VALUES(?,?)', [newId, roleRows[0].id]);
        }
      }
    }

    const rows = await this.query(
      'SELECT id, email, name, preferred_lang, created_at FROM users WHERE id = ?',
      [newId]
    );
    return rows[0] || null;
  }

  async updateUser(id: any, changes: Change[]): Promise<any> {
    const rolesChange = changes.find((c) => c.field === 'roles');
    const regularChanges = changes.filter((c) => c.field !== 'roles');
    if (regularChanges.length > 0) {
      const sets = regularChanges.map((c) => `${c.field} = ?`).join(', ');
      await this.run(
        `UPDATE users SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...regularChanges.map((c) => c.value), id]
      );
    }
    if (rolesChange !== undefined) {
      const roleNames = Array.isArray(rolesChange.value)
        ? rolesChange.value
        : String(rolesChange.value).split(',').filter(Boolean);
      await this.run('DELETE FROM user_roles WHERE user_id = ?', [id]);
      for (const roleName of roleNames) {
        const roleRows = await this.query('SELECT id FROM roles WHERE name = ?', [roleName.trim()]);
        if (roleRows[0]) {
          await this.run('INSERT INTO user_roles(user_id, role_id) VALUES(?,?)', [id, roleRows[0].id]);
        }
      }
    }
    const rows = await this.query(
      'SELECT id, email, name, preferred_lang, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  async getProfile(userId: any): Promise<any> {
    const rows = await this.query(
      `SELECT u.id, u.email, u.name, u.avatar_url, u.preferred_lang, u.created_at,
        string_agg(r.name, ',') as roles_csv
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = ?
       GROUP BY u.id, u.email, u.name, u.avatar_url, u.preferred_lang, u.created_at`,
      [userId]
    );
    if (!rows[0]) return null;
    return { ...rows[0], roles: rows[0].roles_csv ? rows[0].roles_csv.split(',').filter(Boolean) : [] };
  }

  async getUserPasswordHash(userId: any): Promise<string | null> {
    const rows = await this.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    return rows[0]?.password_hash || null;
  }

  async updateProfile(userId: any, fields: Record<string, any>): Promise<boolean | null> {
    if (!Object.keys(fields).length) return null;
    const sets = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
    await this.run(
      `UPDATE users SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...Object.values(fields), userId]
    );
    return true;
  }

  async listNotifications(userId: any): Promise<any[]> {
    return this.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
  }

  async createNotification(notification: TranslationEntry | any): Promise<any> {
    const id = notification.id || crypto.randomUUID();
    await this.run(
      'INSERT INTO notifications(id, user_id, type, title, body) VALUES(?,?,?,?,?)',
      [id, notification.user_id, notification.type, notification.title, notification.body || null]
    );
    const rows = await this.query('SELECT * FROM notifications WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async markAllNotificationsRead(userId: any): Promise<void> {
    await this.run('UPDATE notifications SET read = true WHERE user_id = ?', [userId]);
  }

  async markNotificationRead(notificationId: any, userId: any): Promise<void> {
    await this.run(
      'UPDATE notifications SET read = true WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
  }

  async listTranslations({ lang = 'en', page = '', q = '' }: { lang?: string; page?: string; q?: string } = {}): Promise<any[]> {
    let where = 'WHERE lang = ?';
    const params = [lang];
    if (page) { where += ' AND page = ?'; params.push(page); }
    if (q) {
      where += ' AND (text ILIKE ? OR translated ILIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    return this.query(`SELECT * FROM translations ${where} ORDER BY page, component, text`, params);
  }

  async getTranslationMap(lang: string, page: string): Promise<Record<string, string>> {
    const rows = await this.query(
      `SELECT text, component, translated FROM translations
       WHERE lang = ? AND (page = ? OR page = '*')
       ORDER BY page`,
      [lang, page]
    );
    const result: Record<string, string> = {};
    for (const row of rows) {
      const key = row.component ? `${row.component}::${row.text}` : row.text;
      result[key] = row.translated;
    }
    return result;
  }

  async saveTranslation(entry: TranslationEntry): Promise<void> {
    await this.run(
      `INSERT INTO translations(lang, page, component, text, translated)
       VALUES(?,?,?,?,?)
       ON CONFLICT ON CONSTRAINT idx_translations DO UPDATE SET translated = EXCLUDED.translated`,
      [entry.lang, entry.page, entry.component || null, entry.text, entry.translated]
    );
  }

  async updateTranslation(id: any, translated: any): Promise<void> {
    await this.run('UPDATE translations SET translated = ? WHERE id = ?', [translated, id]);
  }

  async deleteTranslation(id: any): Promise<void> {
    await this.run('DELETE FROM translations WHERE id = ?', [id]);
  }
}

function convertRow(row: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    typeof value === 'bigint' ? Number(value) : value instanceof Date ? value.toISOString() : value,
  ]));
}

function runOnConnection(conn: any, sql: string, params: any[] = []): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    conn.run(sql, ...params, (err: any) => (err ? reject(err) : resolve()));
  });
}

function queryOnConnection(conn: any, sql: string, params: any[] = []): Promise<any[]> {
  return new Promise<any[]>((resolve, reject) => {
    conn.all(sql, ...params, (err: any, rows: any[]) => {
      if (err) return reject(err);
      resolve((rows || []).map(convertRow));
    });
  });
}

function bindNamedParams(sql: string, params: Record<string, any> = {}) {
  const values: any[] = [];
  const statement = sql.trim().replace(/;\s*$/, '').replace(/:([A-Za-z_]\w*)/g, (_: string, name: string) => {
    values.push(params[name] ?? null);
    return '?';
  });
  return { statement, values };
}

function splitSQL(sql: string): string[] {
  const noComments = sql.replace(/--[^\n]*/g, '');
  return noComments
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}
