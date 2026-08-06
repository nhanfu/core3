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

  addOrderChatterEntry: async function(this: any,
    orderId: string,
    operation: 'message' | 'note',
    values: Record<string, unknown>,
    actor: { id?: string | null; name: string },
  ) {
    const content = String(values.content || '').trim();
    if (!content) throw { status: 400, message: 'content required' };
    if (content.length > 4000) throw { status: 400, message: 'content must not exceed 4000 characters' };
    const [order] = await this.query('SELECT id, order_number FROM orders WHERE id = ?', [orderId]);
    if (!order) throw { status: 404, message: 'Order not found' };
    const action = operation === 'message' ? 'orders.message' : 'orders.note';
    await this.recordActivity({
      actorId: actor.id,
      actorName: actor.name,
      action,
      resource: 'orders',
      resourceId: orderId,
      detail: content,
    });
    return { id: orderId, action, detail: content };
  },

  mutateOrderFollower: async function(this: any,
    orderId: string,
    operation: 'follower_add' | 'follower_remove',
    userId: string,
    actor: { id?: string | null; name: string },
  ) {
    const [order] = await this.query('SELECT id FROM orders WHERE id = ?', [orderId]);
    if (!order) throw { status: 404, message: 'Order not found' };
    const [user] = await this.query('SELECT id, name, email, avatar_url FROM users WHERE id = ? AND enabled = true', [userId]);
    if (!user) throw { status: 404, message: 'Follower not found' };
    const [existing] = await this.query('SELECT order_id FROM order_followers WHERE order_id = ? AND user_id = ?', [orderId, userId]);
    const adding = operation === 'follower_add';
    if (adding && !existing) {
      await this.run('INSERT INTO order_followers(order_id, user_id, added_by) VALUES(?,?,?)', [orderId, userId, actor.id || null]);
    } else if (!adding && existing) {
      await this.run('DELETE FROM order_followers WHERE order_id = ? AND user_id = ?', [orderId, userId]);
    }
    if ((adding && !existing) || (!adding && existing)) {
      await this.recordActivity({
        actorId: actor.id,
        actorName: actor.name,
        action: adding ? 'orders.followers.add' : 'orders.followers.remove',
        resource: 'orders',
        resourceId: orderId,
        detail: String(user.name),
      });
    }
    return { order_id: orderId, user_id: userId, name: user.name, email: user.email, avatar_url: user.avatar_url, removed: !adding };
  },

  createOrderAttachment: async function(this: any,
    orderId: string,
    file: { fileName: string; mimeType: string; sizeBytes: number; storageKey: string },
    actor: { id?: string | null; name: string },
  ) {
    const [order] = await this.query('SELECT id FROM orders WHERE id = ?', [orderId]);
    if (!order) throw { status: 404, message: 'Order not found' };
    const id = crypto.randomUUID();
    await this.run(
      'INSERT INTO order_attachments(id, order_id, file_name, mime_type, size_bytes, storage_key, uploaded_by) VALUES(?,?,?,?,?,?,?)',
      [id, orderId, file.fileName, file.mimeType, file.sizeBytes, file.storageKey, actor.id || null],
    );
    await this.recordActivity({
      actorId: actor.id,
      actorName: actor.name,
      action: 'orders.attachments.upload',
      resource: 'orders',
      resourceId: orderId,
      detail: file.fileName,
    });
    const [row] = await this.query(
      'SELECT id, order_id, file_name, mime_type, size_bytes, CAST(created_at AS VARCHAR) AS created_at FROM order_attachments WHERE id = ?',
      [id],
    );
    return row;
  },

  getOrderAttachment: async function(this: any,attachmentId: string) {
    const [row] = await this.query('SELECT * FROM order_attachments WHERE id = ?', [attachmentId]);
    return row || null;
  },

  createChatThread: async function(this: any,
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
  },

  sendChatAttachment: async function(this: any,
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
          id: messageId,
          thread_id: threadId,
          sender_id: actorId,
          sender_name: actor.name,
          body,
          created_at: new Date().toISOString(),
          attachment: {
            id: attachmentId,
            message_id: messageId,
            thread_id: threadId,
            file_name: attachment.fileName,
            mime_type: attachment.mimeType,
            size_bytes: attachment.sizeBytes,
          },
        };
      } catch (error) {
        await runOnConnection(conn, 'ROLLBACK').catch(() => {});
        throw error;
      }
    });
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
