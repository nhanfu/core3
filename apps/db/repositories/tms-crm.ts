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

export const crmMethods = {
  mutateCrmContact: async function(this: any,
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
  },
};

