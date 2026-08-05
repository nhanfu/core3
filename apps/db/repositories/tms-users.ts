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

export const usersMethods = {
  deleteUserRoles: async function(this: any,userId: any): Promise<void> {
    await this.run('DELETE FROM user_roles WHERE user_id = ?', [userId]);
  },

  createUser: async function(this: any,changes: Change[]): Promise<any> {
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
  },

  updateUser: async function(this: any,id: any, changes: Change[]): Promise<any> {
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
  },

  getProfile: async function(this: any,userId: any): Promise<any> {
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
  },

  getCompanyProfile: async function(this: any): Promise<any> {

    const rows = await this.query(
      `SELECT id, name, short_name, tax_code, address, phone, email, website
       FROM company_profiles ORDER BY created_at ASC LIMIT 1`,
    );
    return rows[0] || null;
  },

  getUserPasswordHash: async function(this: any,userId: any): Promise<string | null> {
    const rows = await this.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    return rows[0]?.password_hash || null;
  },

  updateProfile: async function(this: any,userId: any, fields: Record<string, any>): Promise<boolean | null> {
    if (!Object.keys(fields).length) return null;
    const sets = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
    await this.run(
      `UPDATE users SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...Object.values(fields), userId]
    );
    return true;
  },

  listNotifications: async function(this: any,userId: any): Promise<any[]> {
    return this.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
  },

  createNotification: async function(this: any,notification: any): Promise<any> {
    const id = notification.id || crypto.randomUUID();
    await this.run(
      'INSERT INTO notifications(id, user_id, type, title, body, target_path) VALUES(?,?,?,?,?,?)',
      [id, notification.user_id, notification.type, notification.title, notification.body || null, notification.target_path || null]
    );
    const rows = await this.query('SELECT * FROM notifications WHERE id = ?', [id]);
    return rows[0] || null;
  },

  markAllNotificationsRead: async function(this: any,userId: any): Promise<void> {
    await this.run('UPDATE notifications SET read = true WHERE user_id = ?', [userId]);
  },

  markNotificationRead: async function(this: any,notificationId: any, userId: any): Promise<void> {
    await this.run(
      'UPDATE notifications SET read = true WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
  },
};

