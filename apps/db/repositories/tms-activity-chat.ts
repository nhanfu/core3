export const activityChatMethods = {
  recordActivity: async function(this: any,event: {
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
  },

  getOrderAttachment: async function(this: any,attachmentId: string) {
    const [row] = await this.query('SELECT * FROM order_attachments WHERE id = ?', [attachmentId]);
    return row || null;
  },

  getChatAttachment: async function(this: any,attachmentId: string, userId: string): Promise<any | null> {
    const rows = await this.query(
      `SELECT a.id, a.file_name, a.mime_type, a.size_bytes, a.storage_key
       FROM chat_attachments a
       JOIN chat_messages m ON m.id = a.message_id
       JOIN chat_participants p ON p.thread_id = m.thread_id
       WHERE a.id = ? AND p.user_id = ?`,
      [attachmentId, userId],
    );
    return rows[0] || null;
  },

};
