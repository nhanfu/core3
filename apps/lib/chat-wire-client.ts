import { tableFromArrays, tableFromIPC, tableToIPC } from 'apache-arrow';

const fields = [
  'type', 'status', 'operation', 'client_message_id', 'message_id', 'thread_id', 'content', 'error',
  'message_message_id', 'message_thread_id', 'message_sender_id', 'message_sender_name',
  'message_body', 'message_created_at', 'message_attachment_id',
  'message_attachment_file_name', 'message_attachment_mime_type', 'message_attachment_size_bytes',
];

export function encodeChatFrame(message: Record<string, any>): Uint8Array {
  const row: Record<string, unknown> = { ...message };
  const nested = message.message || {};
  for (const [key, value] of Object.entries(nested)) row[key === 'id' ? 'message_message_id' : `message_${key}`] = value;
  return tableToIPC(tableFromArrays(Object.fromEntries(fields.map((field) => [field, [row[field] ?? null]]))), 'stream');
}

export function decodeChatFrame(raw: ArrayBuffer | Uint8Array): Record<string, any> {
  const row: any = tableFromIPC(raw instanceof Uint8Array ? raw : new Uint8Array(raw)).toArray()[0] || {};
  const message: Record<string, unknown> = {};
  for (const field of fields) if (field.startsWith('message_') && field !== 'message_id' && row[field] !== null && row[field] !== undefined) message[field === 'message_message_id' ? 'id' : field.slice('message_'.length)] = row[field];
  const result: Record<string, any> = { type: row.type, status: row.status, operation: row.operation, client_message_id: row.client_message_id, message_id: row.message_id, thread_id: row.thread_id, content: row.content, error: row.error };
  if (Object.keys(message).length) result.message = message;
  return result;
}
