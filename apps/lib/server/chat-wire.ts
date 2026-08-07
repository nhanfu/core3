import { tableFromArrays, tableFromIPC, tableToIPC } from 'apache-arrow';

export type ChatWireMessage = {
  type: string;
  status?: string;
  operation?: string;
  client_message_id?: string;
  message_id?: string;
  thread_id?: string;
  content?: string;
  error?: string;
  message?: Record<string, unknown>;
};

const fields = [
  'type', 'status', 'operation', 'client_message_id', 'message_id', 'thread_id', 'content', 'error',
  'message_message_id', 'message_thread_id', 'message_sender_id', 'message_sender_name',
  'message_body', 'message_created_at', 'message_attachment_id',
  'message_attachment_file_name', 'message_attachment_mime_type', 'message_attachment_size_bytes',
];

export function encodeChatFrame(message: ChatWireMessage): Uint8Array {
  const row: Record<string, unknown> = {
    type: message.type,
    status: message.status,
    operation: message.operation,
    client_message_id: message.client_message_id,
    message_id: message.message_id,
    thread_id: message.thread_id,
    content: message.content,
    error: message.error,
  };
  const nested = message.message || {};
  for (const [key, value] of Object.entries(nested)) row[key === 'id' ? 'message_message_id' : `message_${key}`] = value;
  return tableToIPC(tableFromArrays(Object.fromEntries(fields.map((field) => [field, [row[field] ?? null]]))), 'stream');
}

export function decodeChatFrame(raw: ArrayBuffer | Uint8Array): ChatWireMessage {
  const row: any = tableFromIPC(raw instanceof Uint8Array ? raw : new Uint8Array(raw)).toArray()[0] || {};
  const message: Record<string, unknown> = {};
  for (const field of fields) if (field.startsWith('message_') && field !== 'message_id' && row[field] !== null && row[field] !== undefined) message[field === 'message_message_id' ? 'id' : field.slice('message_'.length)] = row[field];
  const result: ChatWireMessage = {
    type: String(row.type || ''), status: row.status || undefined, operation: row.operation || undefined,
    client_message_id: row.client_message_id || undefined, message_id: row.message_id || undefined,
    thread_id: row.thread_id || undefined, content: row.content || undefined, error: row.error || undefined,
  };
  if (Object.keys(message).length) result.message = message;
  return result;
}
