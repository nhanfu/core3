// @ts-nocheck

export class DuckDbRepository {
  constructor(db) {
    this.db = db;
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, ...params, (err) => (err ? reject(err) : resolve()));
    });
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, ...params, (err, rows) => {
        if (err) return reject(err);
        resolve((rows || []).map(convertRow));
      });
    });
  }

  async runStatements(sqlText) {
    for (const stmt of splitSQL(sqlText)) {
      await this.run(stmt);
    }
  }

  async countRows(table) {
    const rows = await this.query(`SELECT COUNT(*) AS n FROM ${table}`);
    return Number(rows[0]?.n || 0);
  }

  async getLoginUserByEmail(email) {
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

  async refreshUserPasswordHash(userId, hash) {
    await this.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
  }

  async getUserPermissions(userId) {
    const perms = await this.query(
      `SELECT DISTINCT p.permission_key
       FROM permissions p
       JOIN roles r ON r.id = p.role_id
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [userId]
    );
    return perms.map((p) => p.permission_key);
  }

  async querySource(source, params = {}, skip = 0, top = 25) {
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

  async createRecord(table, changes) {
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

  async updateRecord(table, id, changes, timestamps) {
    const sets = changes.map((c) => `${c.field} = ?`).join(', ');
    const tsClause = timestamps ? ', updated_at = CURRENT_TIMESTAMP' : '';
    await this.run(
      `UPDATE ${table} SET ${sets}${tsClause} WHERE id = ?`,
      [...changes.map((c) => c.value), id]
    );
    const rows = await this.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return rows[0] || null;
  }

  async deleteRecord(table, id) {
    await this.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
  }

  async deleteUserRoles(userId) {
    await this.run('DELETE FROM user_roles WHERE user_id = ?', [userId]);
  }

  async createUser(changes) {
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

  async updateUser(id, changes) {
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

  async getProfile(userId) {
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

  async getUserPasswordHash(userId) {
    const rows = await this.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    return rows[0]?.password_hash || null;
  }

  async updateProfile(userId, fields) {
    if (!Object.keys(fields).length) return null;
    const sets = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
    await this.run(
      `UPDATE users SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...Object.values(fields), userId]
    );
    return true;
  }

  async listNotifications(userId) {
    return this.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
  }

  async createNotification(notification) {
    const id = notification.id || crypto.randomUUID();
    await this.run(
      'INSERT INTO notifications(id, user_id, type, title, body) VALUES(?,?,?,?,?)',
      [id, notification.user_id, notification.type, notification.title, notification.body || null]
    );
    const rows = await this.query('SELECT * FROM notifications WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async markAllNotificationsRead(userId) {
    await this.run('UPDATE notifications SET read = true WHERE user_id = ?', [userId]);
  }

  async markNotificationRead(notificationId, userId) {
    await this.run(
      'UPDATE notifications SET read = true WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
  }

  async listTranslations({ lang = 'en', page = '', q = '' } = {}) {
    let where = 'WHERE lang = ?';
    const params = [lang];
    if (page) { where += ' AND page = ?'; params.push(page); }
    if (q) {
      where += ' AND (text ILIKE ? OR translated ILIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    return this.query(`SELECT * FROM translations ${where} ORDER BY page, component, text`, params);
  }

  async getTranslationMap(lang, page) {
    const rows = await this.query(
      `SELECT text, component, translated FROM translations
       WHERE lang = ? AND (page = ? OR page = '*')
       ORDER BY page`,
      [lang, page]
    );
    const result = {};
    for (const row of rows) {
      const key = row.component ? `${row.component}::${row.text}` : row.text;
      result[key] = row.translated;
    }
    return result;
  }

  async saveTranslation(entry) {
    await this.run(
      `INSERT INTO translations(lang, page, component, text, translated)
       VALUES(?,?,?,?,?)
       ON CONFLICT ON CONSTRAINT idx_translations DO UPDATE SET translated = EXCLUDED.translated`,
      [entry.lang, entry.page, entry.component || null, entry.text, entry.translated]
    );
  }

  async updateTranslation(id, translated) {
    await this.run('UPDATE translations SET translated = ? WHERE id = ?', [translated, id]);
  }

  async deleteTranslation(id) {
    await this.run('DELETE FROM translations WHERE id = ?', [id]);
  }
}

function convertRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    typeof value === 'bigint' ? Number(value) : value instanceof Date ? value.toISOString() : value,
  ]));
}

function bindNamedParams(sql, params = {}) {
  const values = [];
  const statement = sql.trim().replace(/;\s*$/, '').replace(/:([A-Za-z_]\w*)/g, (_, name) => {
    values.push(params[name] ?? null);
    return '?';
  });
  return { statement, values };
}

function splitSQL(sql) {
  const noComments = sql.replace(/--[^\n]*/g, '');
  return noComments
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}
