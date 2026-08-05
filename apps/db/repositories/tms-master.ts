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

export const masterMethods = {
  setOrderWorkflowStatus: async function(this: any,orderId: string, status: string, actor: { id?: string | null; name: string }) {
    const [order] = await this.query('SELECT id FROM orders WHERE id = ?', [orderId]);
    if (!order) throw { status: 404, message: 'Order not found' };
    await this.run(
      `INSERT INTO order_workflow_states(order_id, status, updated_at) VALUES(?,?,CURRENT_TIMESTAMP)
       ON CONFLICT(order_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
      [orderId, status],
    );
    await this.recordActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'kanban_status',
      resource: 'orders',
      resourceId: orderId,
      detail: `Moved order to ${status}`,
    });
    return { id: orderId, status };
  },

  addOrderWorkflowStatus: async function(this: any,label: string, actor: { id?: string | null; name: string }) {
    const status = label.trim();
    if (!status || status.length > 80) throw { status: 400, message: 'Status name must be 1-80 characters' };
    const [existing] = await this.query("SELECT id FROM system_configs WHERE kind = 'trip_status' AND config_value LIKE 'order_status:%' AND lower(code) = lower(?)", [status]);
    if (existing) throw { status: 409, message: 'Status already exists' };
    const next = await this.query("SELECT COALESCE(MAX(sort_order), 0) + 10 AS value FROM system_configs WHERE kind = 'trip_status' AND config_value LIKE 'order_status:%'");
    const id = crypto.randomUUID();
    await this.run(
      "INSERT INTO system_configs(id, kind, code, name, config_value, status, sort_order) VALUES(?, 'trip_status', ?, ?, 'order_status:neutral', 'Active', ?)",
      [id, status, status, Number(next[0]?.value || 10)],
    );
    await this.recordActivity({ actorId: actor.id, actorName: actor.name, action: 'create', resource: 'order_status', resourceId: id, detail: `Created status ${status}` });
    return { id, value: status, label: status, color: 'neutral' };
  },

  runStatements: async function(this: any,sqlText: string): Promise<void> {
    for (const stmt of splitSQL(sqlText)) {
      await this.run(stmt);
    }
  },

  countRows: async function(this: any,table: string): Promise<number> {
    const rows = await this.query(`SELECT COUNT(*) AS n FROM ${table}`);
    return Number(rows[0]?.n || 0);
  },

  createEmployeeDocument: async function(this: any,employeeId: string, file: { fileName: string; mimeType: string; sizeBytes: number; storageKey: string }, actor: { id?: string | null; name: string }) {
    const [employee] = await this.query('SELECT id FROM employees WHERE id = ?', [employeeId]);
    if (!employee) throw { status: 404, message: 'Employee not found' };
    const id = crypto.randomUUID();
    await this.run('INSERT INTO employee_documents(id, employee_id, file_name, mime_type, size_bytes, storage_key, uploaded_by) VALUES(?,?,?,?,?,?,?)', [id, employeeId, file.fileName, file.mimeType, file.sizeBytes, file.storageKey, actor.id || null]);
    await this.recordActivity({ actorId: actor.id, actorName: actor.name, action: 'upload', resource: 'employees', resourceId: employeeId, detail: `Uploaded ${file.fileName}` });
    const [row] = await this.query('SELECT id, employee_id, file_name, mime_type, size_bytes, created_at FROM employee_documents WHERE id = ?', [id]);
    return row;
  },

  syncCurrencyRates: async function(this: any,
    rates: Record<string, number>,
    source: string,
    actor: { id?: string | null; name: string },
  ) {
    return this.withConnection(async (conn) => {
      await runOnConnection(conn, 'BEGIN TRANSACTION');
      try {
        const today = new Date().toISOString().slice(0, 10);
        const now = new Date();
        const updated: Array<{ currency_code: string; rate_to_vnd: number }> = [];
        for (const [currencyCode, rawRate] of Object.entries(rates)) {
          const code = String(currencyCode).trim().toUpperCase();
          const rate = Number(rawRate);
          if (!/^[A-Z]{3}$/.test(code) || !Number.isFinite(rate) || rate <= 0) continue;
          await runOnConnection(conn, `
            INSERT INTO currency_rates(id, currency_code, rate_to_vnd, effective_date, source, synced_at, updated_at)
            VALUES(?,?,?,?,?,?,?)
            ON CONFLICT(currency_code) DO UPDATE SET
              rate_to_vnd = excluded.rate_to_vnd,
              effective_date = excluded.effective_date,
              source = excluded.source,
              synced_at = excluded.synced_at,
              updated_at = excluded.updated_at
          `, [crypto.randomUUID(), code, rate, today, source, now, now]);
          updated.push({ currency_code: code, rate_to_vnd: rate });
        }
        if (!updated.length) throw Object.assign(new Error('No valid currency rates supplied'), { status: 400 });
        await runOnConnection(conn, `
          INSERT INTO system_activity(id, actor_id, actor_name, action, resource, resource_id, detail)
          VALUES(gen_random_uuid(), ?, ?, 'sync_rates', 'currencies', NULL, ?)
        `, [actor.id || null, actor.name, `Synchronized ${updated.length} currency rates from ${source}`]);
        await runOnConnection(conn, 'COMMIT');
        return { synced: updated.length, source, rates: updated };
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK').catch(() => {});
        throw error;
      }
    });
  },

  getEmployeeDocument: async function(this: any,documentId: string) {
    const [row] = await this.query('SELECT d.*, e.id AS employee_id FROM employee_documents d JOIN employees e ON e.id = d.employee_id WHERE d.id = ?', [documentId]);
    return row || null;
  },

  createContractDocument: async function(this: any,contractId: string, file: { fileName: string; mimeType: string; sizeBytes: number; storageKey: string }, actor: { id?: string | null; name: string }) {
    const [contract] = await this.query('SELECT id FROM employment_contracts WHERE id = ?', [contractId]);
    if (!contract) throw { status: 404, message: 'Contract not found' };
    const id = crypto.randomUUID();
    await this.run('INSERT INTO contract_documents(id, contract_id, file_name, mime_type, size_bytes, storage_key, uploaded_by) VALUES(?,?,?,?,?,?,?)', [id, contractId, file.fileName, file.mimeType, file.sizeBytes, file.storageKey, actor.id || null]);
    await this.recordActivity({ actorId: actor.id, actorName: actor.name, action: 'upload', resource: 'employment_contracts', resourceId: contractId, detail: `Uploaded ${file.fileName}` });
    const [row] = await this.query('SELECT id, contract_id, file_name, mime_type, size_bytes, created_at FROM contract_documents WHERE id = ?', [id]);
    return row;
  },

  getContractDocument: async function(this: any,documentId: string) {
    const [row] = await this.query('SELECT d.*, c.id AS contract_id FROM contract_documents d JOIN employment_contracts c ON c.id = d.contract_id WHERE d.id = ?', [documentId]);
    return row || null;
  },

  createCompanyDocument: async function(this: any,companyId: string, file: { fileName: string; mimeType: string; sizeBytes: number; storageKey: string }, actor: { id?: string | null; name: string }) {
    const [company] = await this.query('SELECT id FROM company_profiles WHERE id = ?', [companyId]);
    if (!company) throw { status: 404, message: 'Company profile not found' };
    const id = crypto.randomUUID();
    await this.run('INSERT INTO company_documents(id, company_id, file_name, mime_type, size_bytes, storage_key, uploaded_by) VALUES(?,?,?,?,?,?,?)', [id, companyId, file.fileName, file.mimeType, file.sizeBytes, file.storageKey, actor.id || null]);
    await this.recordActivity({ actorId: actor.id, actorName: actor.name, action: 'upload', resource: 'company_profiles', resourceId: companyId, detail: `Uploaded ${file.fileName}` });
    const [row] = await this.query('SELECT id, company_id, file_name, mime_type, size_bytes, created_at FROM company_documents WHERE id = ?', [id]);
    return row;
  },

  getCompanyDocument: async function(this: any,documentId: string) {
    const [row] = await this.query('SELECT d.*, c.id AS company_id FROM company_documents d JOIN company_profiles c ON c.id = d.company_id WHERE d.id = ?', [documentId]);

    return row || null;
  },

  importMasterData: async function(this: any,scope: string, csvText: string, actor: { id?: string | null; name: string }) {
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
  },

  getLoginUserByEmail: async function(this: any,email: string): Promise<any | null> {
    const rows = await this.query(
      `SELECT u.*,
              string_agg(r.name, ',') AS roles_csv,
              COALESCE(
                (
                  SELECT CASE
                    WHEN bool_or(scope_role.view_scope = 'all') THEN 'all'
                    WHEN bool_or(scope_role.view_scope = 'branch') THEN 'branch'
                    ELSE 'own'
                  END
                  FROM user_roles scope_ur
                  JOIN roles scope_role ON scope_role.id = scope_ur.role_id
                  WHERE scope_ur.user_id = u.id
                ),
                'all'
              ) AS view_scope
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
  },

  refreshUserPasswordHash: async function(this: any,userId: any, hash: string): Promise<void> {
    await this.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
  },

  recordUserLogin: async function(this: any,userId: any): Promise<void> {
    await this.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
  },

  getUserPermissions: async function(this: any,userId: any): Promise<string[]> {
    const perms = await this.query(
      `SELECT DISTINCT p.permission_key
       FROM permissions p
       JOIN roles r ON r.id = p.role_id
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [userId]
    );
    return perms.map((p: any) => p.permission_key);
  },

  mutateRolePermission: async function(this: any,operation: 'grant' | 'revoke', roleId: string, permissionKey: string, action: string, actor: { id?: string | null; name: string }) {
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
  },

  mutateUserRole: async function(this: any,operation: 'grant' | 'revoke', userId: string, roleId: string, action: string, actor: { id?: string | null; name: string }) {
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
  },
};

