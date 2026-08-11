export const usersMethods = {
  getProfile: async function(this: any, userId: any): Promise<any> {
    const rows = await this.query(
      `SELECT u.id, u.email, u.name, u.avatar_url, u.preferred_lang, u.created_at,
        string_agg(r.name, ',') AS roles_csv
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = ?
       GROUP BY u.id, u.email, u.name, u.avatar_url, u.preferred_lang, u.created_at`,
      [userId],
    );
    if (!rows[0]) return null;
    return { ...rows[0], roles: rows[0].roles_csv ? rows[0].roles_csv.split(',').filter(Boolean) : [] };
  },

  getCompanyProfile: async function(this: any): Promise<any> {
    const rows = await this.query(
      'SELECT id, name, short_name, tax_code, address, phone, email, website FROM company_profiles ORDER BY created_at ASC LIMIT 1',
    );
    return rows[0] || null;
  },

  updateProfile: async function(this: any, userId: any, fields: Record<string, any>): Promise<boolean | null> {
    if (!Object.keys(fields).length) return null;
    const sets = Object.keys(fields).map((key) => `${key} = ?`).join(', ');
    await this.run(`UPDATE users SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...Object.values(fields), userId]);
    return true;
  },
};
