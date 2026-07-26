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

function normalizeContactValues(values: Record<string, unknown>) {
  const name = String(values.name || '').trim();
  const roleTitle = String(values.role_title || '').trim();
  const phone = String(values.phone || '').trim();
  const email = String(values.email || '').trim().toLowerCase();
  const notes = String(values.notes || '').trim();
  const isPrimary = values.is_primary === true || String(values.is_primary).toLowerCase() === 'true';
  if (!name) throw { status: 400, message: 'contact name required' };
  if (!phone && !email) throw { status: 400, message: 'contact phone or email required' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw { status: 400, message: 'invalid contact email' };
  }
  return { name, roleTitle, phone, email, notes, isPrimary };
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

  async createEmployeeDocument(employeeId: string, file: { fileName: string; mimeType: string; sizeBytes: number; storageKey: string }, actor: { id?: string | null; name: string }) {
    const [employee] = await this.query('SELECT id FROM employees WHERE id = ?', [employeeId]);
    if (!employee) throw { status: 404, message: 'Employee not found' };
    const id = crypto.randomUUID();
    await this.run('INSERT INTO employee_documents(id, employee_id, file_name, mime_type, size_bytes, storage_key, uploaded_by) VALUES(?,?,?,?,?,?,?)', [id, employeeId, file.fileName, file.mimeType, file.sizeBytes, file.storageKey, actor.id || null]);
    await this.recordActivity({ actorId: actor.id, actorName: actor.name, action: 'upload', resource: 'employees', resourceId: employeeId, detail: `Uploaded ${file.fileName}` });
    const [row] = await this.query('SELECT id, employee_id, file_name, mime_type, size_bytes, created_at FROM employee_documents WHERE id = ?', [id]);
    return row;
  }

  async getEmployeeDocument(documentId: string) {
    const [row] = await this.query('SELECT d.*, e.id AS employee_id FROM employee_documents d JOIN employees e ON e.id = d.employee_id WHERE d.id = ?', [documentId]);
    return row || null;
  }

  async importMasterData(scope: string, csvText: string, actor: { id?: string | null; name: string }) {
    const allowed = new Set(['container_type', 'vehicle_type', 'unit', 'cargo_type', 'fee_type', 'currency']);
    if (!allowed.has(scope)) throw { status: 400, message: 'Invalid master-data scope' };
    const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2 || lines.length > 1001) throw { status: 400, message: 'CSV must contain 1 to 1000 data rows' };
    const parse = (line: string) => {
      const cells: string[] = [];
      let cell = ''; let quoted = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++; continue; }
        if (ch === '"') { quoted = !quoted; continue; }
        if (ch === ',' && !quoted) { cells.push(cell.trim()); cell = ''; continue; }
        cell += ch;
      }
      cells.push(cell.trim());
      return cells;
    };
    const header = parse(lines[0]).map(value => value.toLowerCase());
    if (header[0] !== 'code' || header[1] !== 'name') throw { status: 400, message: 'CSV headers must start with code,name' };
    const codeIndex = header.indexOf('code'); const nameIndex = header.indexOf('name');
    const descriptionIndex = header.indexOf('description'); const symbolIndex = header.indexOf('symbol');
    const decimalsIndex = header.indexOf('decimals'); const statusIndex = header.indexOf('status'); const sortIndex = header.indexOf('sort_order');
    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        let imported = 0;
        for (const line of lines.slice(1)) {
          const cells = parse(line); const code = cells[codeIndex] || ''; const name = cells[nameIndex] || '';
          if (!code || !name) throw { status: 400, message: 'code and name are required for every row' };
          const description = descriptionIndex >= 0 ? cells[descriptionIndex] || null : null;
          const symbol = symbolIndex >= 0 ? cells[symbolIndex] || null : null;
          const decimals = decimalsIndex >= 0 && cells[decimalsIndex] ? Number(cells[decimalsIndex]) : 0;
          const status = statusIndex >= 0 && cells[statusIndex] ? cells[statusIndex] : 'Active';
          const sortOrder = sortIndex >= 0 && cells[sortIndex] ? Number(cells[sortIndex]) : 0;
          if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6 || !Number.isInteger(sortOrder) || !['Active', 'Inactive'].includes(status)) throw { status: 400, message: `Invalid values for ${code}` };
          await runOnConnection(conn, `INSERT INTO master_data(id, kind, code, name, description, symbol, decimals, status, sort_order) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(kind, code) DO UPDATE SET name = excluded.name, description = excluded.description, symbol = excluded.symbol, decimals = excluded.decimals, status = excluded.status, sort_order = excluded.sort_order`, [crypto.randomUUID(), scope, code, name, description, symbol, decimals, status, sortOrder]);
          imported++;
        }
        await runOnConnection(conn, 'INSERT INTO system_activity(actor_id, actor_name, action, resource, detail) VALUES(?,?,?,?,?)', [actor.id || null, actor.name, 'import', 'master_data', `Imported ${imported} ${scope} records`]);
        await runOnConnection(conn, 'COMMIT');
        return { imported, scope };
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK');
        throw error;
      }
    });
  }

  async getLoginUserByEmail(email: string): Promise<any | null> {
    const rows = await this.query(
      `SELECT u.*, string_agg(r.name, ',') as roles_csv
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.email = ?
       GROUP BY u.id, u.email, u.name, u.password_hash, u.avatar_url,
                u.preferred_lang, u.enabled, u.branch_id, u.department_id,
                u.last_login, u.created_at, u.updated_at`,
      [email]
    );
    return rows[0] || null;
  }

  async refreshUserPasswordHash(userId: any, hash: string): Promise<void> {
    await this.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
  }

  async recordUserLogin(userId: any): Promise<void> {
    await this.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
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

  async mutateRolePermission(operation: 'grant' | 'revoke', roleId: string, permissionKey: string, action: string, actor: { id?: string | null; name: string }) {
    if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(permissionKey)) throw { status: 400, message: 'Invalid permission key' };
    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        const [role] = await queryOnConnection(conn, 'SELECT id, name FROM roles WHERE id = ?', [roleId]);
        if (!role) throw { status: 404, message: 'Role not found' };
        if (operation === 'grant') {
          await runOnConnection(conn, 'INSERT INTO permissions(id, role_id, permission_key) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE role_id = ? AND permission_key = ?)', [crypto.randomUUID(), roleId, permissionKey, roleId, permissionKey]);
        } else {
          await runOnConnection(conn, 'DELETE FROM permissions WHERE role_id = ? AND permission_key = ?', [roleId, permissionKey]);
        }
        await runOnConnection(conn, 'INSERT INTO system_activity(actor_id, actor_name, action, resource, resource_id, detail) VALUES(?,?,?,?,?,?)', [actor.id || null, actor.name, action, 'roles', roleId, `${operation === 'grant' ? 'Cấp' : 'Thu hồi'} quyền ${permissionKey}`]);
        const rows = await queryOnConnection(conn, 'SELECT permission_key FROM permissions WHERE role_id = ? ORDER BY permission_key', [roleId]);
        await runOnConnection(conn, 'COMMIT');
        return { role_id: roleId, permissions: rows.map((row: any) => row.permission_key) };
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK');
        throw error;
      }
    });
  }

  async mutateUserRole(operation: 'grant' | 'revoke', userId: string, roleId: string, action: string, actor: { id?: string | null; name: string }) {
    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        const [user] = await queryOnConnection(conn, 'SELECT id, name FROM users WHERE id = ?', [userId]);
        const [role] = await queryOnConnection(conn, 'SELECT id, name FROM roles WHERE id = ?', [roleId]);
        if (!user || !role) throw { status: 404, message: 'User or role not found' };
        if (operation === 'grant') {
          await runOnConnection(conn, 'INSERT INTO user_roles(user_id, role_id) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = ? AND role_id = ?)', [userId, roleId, userId, roleId]);
        } else {
          await runOnConnection(conn, 'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?', [userId, roleId]);
        }
        await runOnConnection(conn, 'INSERT INTO system_activity(actor_id, actor_name, action, resource, resource_id, detail) VALUES(?,?,?,?,?,?)', [actor.id || null, actor.name, action, 'users', userId, `${operation === 'grant' ? 'Gán' : 'Thu hồi'} vai trò ${role.name}`]);
        const rows = await queryOnConnection(conn, 'SELECT r.id, r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ? ORDER BY r.name', [userId]);
        await runOnConnection(conn, 'COMMIT');
        return { user_id: userId, roles: rows };
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK');
        throw error;
      }
    });
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
    if (table === 'orders') {
      return this.updateOrderRecord(id, changes, timestamps);
    }
    const sets = changes.map((c) => `${c.field} = ?`).join(', ');
    const tsClause = timestamps ? ', updated_at = CURRENT_TIMESTAMP' : '';
    await this.run(
      `UPDATE ${table} SET ${sets}${tsClause} WHERE id = ?`,
      [...changes.map((c) => c.value), id]
    );
    const rows = await this.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return rows[0] || null;
  }

  private async updateOrderRecord(id: any, changes: Change[], timestamps: boolean): Promise<any> {
    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        const lines = await queryOnConnection(
          conn,
          'SELECT id, order_id, sequence, description, quantity, unit, unit_price, tax_rate, line_total, created_at, updated_at FROM order_lines WHERE order_id = ? ORDER BY sequence, id',
          [id],
        );
        const [workflowState] = await queryOnConnection(
          conn,
          'SELECT order_id, status, updated_at FROM order_workflow_states WHERE order_id = ?',
          [id],
        );
        if (lines.length) await runOnConnection(conn, 'DELETE FROM order_lines WHERE order_id = ?', [id]);
        if (workflowState) await runOnConnection(conn, 'DELETE FROM order_workflow_states WHERE order_id = ?', [id]);

        const sets = changes.map((change) => `${change.field} = ?`).join(', ');
        const values = [...changes.map((change) => change.value), ...(timestamps ? [new Date()] : []), id];
        await runOnConnection(
          conn,
          `UPDATE orders SET ${sets}${timestamps ? ', updated_at = ?' : ''} WHERE id = ?`,
          values,
        );

        if (workflowState) {
          await runOnConnection(
            conn,
            'INSERT INTO order_workflow_states(order_id, status, updated_at) VALUES(?,?,?)',
            [workflowState.order_id, workflowState.status, workflowState.updated_at],
          );
        }
        for (const line of lines) {
          await runOnConnection(
            conn,
            `INSERT INTO order_lines(
              id, order_id, sequence, description, quantity, unit, unit_price,
              tax_rate, line_total, created_at, updated_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
            [line.id, line.order_id, line.sequence, line.description, line.quantity, line.unit, line.unit_price, line.tax_rate, line.line_total, line.created_at, line.updated_at],
          );
        }
        const [updated] = await queryOnConnection(conn, 'SELECT * FROM orders WHERE id = ?', [id]);
        await runOnConnection(conn, 'COMMIT');
        return updated || null;
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK').catch(() => {});
        throw error;
      }
    });
  }

  async deleteRecord(table: string, id: any): Promise<void> {
    if (
      table !== 'orders'
      && table !== 'quotes'
      && table !== 'accounting_entries'
      && table !== 'customers'
      && table !== 'partners'
      && table !== 'system_configs'
    ) {
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
                : table === 'accounting_entries'
                  ? 'accounting_entry_lines'
                  : table === 'customers'
                    ? 'customer_contacts'
                    : table === 'partners'
                      ? 'partner_contacts'
                      : 'approval_flow_steps'
          }
           WHERE ${
             table === 'orders'
               ? 'order_id'
               : table === 'quotes'
                 ? 'quote_id'
                 : table === 'accounting_entries'
                   ? 'entry_id'
                 : table === 'customers'
                     ? 'customer_id'
                     : table === 'partners'
                       ? 'partner_id'
                       : 'flow_id'
           } = ?`,
        [id],
      );
        if (table === 'orders') {
          await runOnConnection(conn, 'DELETE FROM order_workflow_states WHERE order_id = ?', [id]);
        }
        if (table === 'system_configs') {
          await runOnConnection(conn, 'DELETE FROM print_template_blocks WHERE template_id = ?', [id]);
        }
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

  async mutateCrmContact(
    config: {
      parentTable: 'customers' | 'partners';
      contactTable: 'customer_contacts' | 'partner_contacts';
      parentKey: 'customer_id' | 'partner_id';
      label: string;
    },
    operation: 'create' | 'update' | 'delete',
    parentId: string,
    contactId: string | null,
    values: Record<string, unknown>,
    action: string,
    actor: { id?: string | null; name: string },
  ): Promise<any> {
    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        const [parent] = await queryOnConnection(
          conn,
          `SELECT id, code, name FROM ${config.parentTable} WHERE id = ?`,
          [parentId],
        );
        if (!parent) throw { status: 404, message: `${config.label} not found` };

        let contact: any = null;
        let auditName = '';
        let deletedPrimary = false;
        if (operation === 'delete') {
          if (!contactId) throw { status: 400, message: 'contact_id required' };
          const [existing] = await queryOnConnection(
            conn,
            `SELECT * FROM ${config.contactTable}
             WHERE id = ? AND ${config.parentKey} = ?`,
            [contactId, parentId],
          );
          if (!existing) throw { status: 404, message: 'Contact not found' };
          auditName = existing.name;
          deletedPrimary = Boolean(existing.is_primary);
          await runOnConnection(
            conn,
            `DELETE FROM ${config.contactTable}
             WHERE id = ? AND ${config.parentKey} = ?`,
            [contactId, parentId],
          );
        } else {
          const normalized = normalizeContactValues(values);
          let makePrimary = normalized.isPrimary;
          if (operation === 'create') {
            const [{ count }] = await queryOnConnection(
              conn,
              `SELECT COUNT(*) AS count FROM ${config.contactTable} WHERE ${config.parentKey} = ?`,
              [parentId],
            );
            makePrimary = makePrimary || Number(count) === 0;
          }
          if (makePrimary) {
            await runOnConnection(
              conn,
              `UPDATE ${config.contactTable}
               SET is_primary = false, updated_at = CURRENT_TIMESTAMP
               WHERE ${config.parentKey} = ?`,
              [parentId],
            );
          }

          if (operation === 'create') {
            const id = crypto.randomUUID();
            await runOnConnection(
              conn,
              `INSERT INTO ${config.contactTable}(
                id, ${config.parentKey}, name, role_title, phone, email, is_primary, notes
              ) VALUES(?,?,?,?,?,?,?,?)`,
              [
                id,
                parentId,
                normalized.name,
                normalized.roleTitle || null,
                normalized.phone || null,
                normalized.email || null,
                makePrimary,
                normalized.notes || null,
              ],
            );
            [contact] = await queryOnConnection(
              conn,
              `SELECT * FROM ${config.contactTable} WHERE id = ?`,
              [id],
            );
          } else {
            if (!contactId) throw { status: 400, message: 'contact_id required' };
            const [existing] = await queryOnConnection(
              conn,
              `SELECT * FROM ${config.contactTable}
               WHERE id = ? AND ${config.parentKey} = ?`,
              [contactId, parentId],
            );
            if (!existing) throw { status: 404, message: 'Contact not found' };
            // A parent must retain one primary contact. Choosing another
            // contact as primary is the supported way to demote this record.
            makePrimary = makePrimary || Boolean(existing.is_primary);
            await runOnConnection(
              conn,
              `UPDATE ${config.contactTable}
               SET name = ?, role_title = ?, phone = ?, email = ?, is_primary = ?,
                 notes = ?, updated_at = CURRENT_TIMESTAMP
               WHERE id = ? AND ${config.parentKey} = ?`,
              [
                normalized.name,
                normalized.roleTitle || null,
                normalized.phone || null,
                normalized.email || null,
                makePrimary,
                normalized.notes || null,
                contactId,
                parentId,
              ],
            );
            [contact] = await queryOnConnection(
              conn,
              `SELECT * FROM ${config.contactTable} WHERE id = ?`,
              [contactId],
            );
          }
          auditName = normalized.name;
        }

        if (deletedPrimary) {
          const [replacement] = await queryOnConnection(
            conn,
            `SELECT id FROM ${config.contactTable}
             WHERE ${config.parentKey} = ?
             ORDER BY created_at, id
             LIMIT 1`,
            [parentId],
          );
          if (replacement) {
            await runOnConnection(
              conn,
              `UPDATE ${config.contactTable}
               SET is_primary = true, updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [replacement.id],
            );
          }
        }

        const [primary] = await queryOnConnection(
          conn,
          `SELECT phone, email FROM ${config.contactTable}
           WHERE ${config.parentKey} = ? AND is_primary = true
           ORDER BY created_at
           LIMIT 1`,
          [parentId],
        );
        if (primary) {
          await runOnConnection(
            conn,
            `UPDATE ${config.parentTable}
             SET phone = ?, email = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [primary.phone || null, primary.email || null, parentId],
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
            `${parent.code}: ${operation} contact ${auditName}`,
          ],
        );
        await runOnConnection(conn, 'COMMIT');
        return { contact, parent_id: parentId };
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK').catch(() => {});
        throw error;
      }
    });
  }

  async mutateApprovalFlowStep(
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
            await runOnConnection(conn, 'UPDATE approval_flow_steps SET sequence = ? WHERE id = ?', [neighbor.sequence, current.id]);
            await runOnConnection(conn, 'UPDATE approval_flow_steps SET sequence = ? WHERE id = ?', [current.sequence, neighbor.id]);
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
  }

  async cancelTrip(tripId: string, action: string, actor: { id?: string | null; name: string }): Promise<any> {
    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        const [trip] = await queryOnConnection(conn, 'SELECT * FROM trips WHERE id = ?', [tripId]);
        if (!trip) throw { status: 404, message: 'Trip not found' };
        if (!['Scheduled', 'In Transit'].includes(String(trip.status))) {
          throw { status: 409, message: `Trip cannot be cancelled while ${trip.status}` };
        }
        await runOnConnection(conn, 'UPDATE trips SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['Cancelled', tripId]);
        await runOnConnection(conn, 'INSERT INTO system_activity(id, actor_id, actor_name, action, resource, resource_id, detail) VALUES(?,?,?,?,?,?,?)', [crypto.randomUUID(), actor.id || null, actor.name, action, 'trips', tripId, `Cancelled trip ${trip.trip_number}`]);
        const [updated] = await queryOnConnection(conn, 'SELECT * FROM trips WHERE id = ?', [tripId]);
        await runOnConnection(conn, 'COMMIT');
        return updated;
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK');
        throw error;
      }
    });
  }

  async mutatePrintTemplateBlock(
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
          if (!label) throw { status: 400, message: 'block label required' };
          if (!['text', 'token', 'table', 'spacer'].includes(blockType)) throw { status: 400, message: 'invalid block type' };
          if (blockType === 'token' && !tokenKey) throw { status: 400, message: 'token key required' };
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
            await runOnConnection(conn, 'UPDATE print_template_blocks SET sequence = ? WHERE id = ?', [neighbor.sequence, current.id]);
            await runOnConnection(conn, 'UPDATE print_template_blocks SET sequence = ? WHERE id = ?', [current.sequence, neighbor.id]);
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
    const passwordChange = changes.find((c) => c.field === 'password');
    let regularChanges = changes.filter((c) => c.field !== 'roles' && c.field !== 'password');
    if (passwordChange) {
      regularChanges = [...regularChanges, { field: 'password_hash', value: await Bun.password.hash(passwordChange.value) }];
    }
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
