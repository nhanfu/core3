/**
 * Small binary protocol for chat WebSocket frames.
 *
 * Frame layout:
 *   u8 magic[2] = 0x43, 0x33 ("C3")
 *   u8 version = 1
 *   u32 presence bitmap (little endian)
 *   present values in field order:
 *     strings: u32 byte length + UTF-8 bytes
 *     attachment_size_bytes: f64 little endian
 *
 * The bitmap makes absent optional values free on the wire and avoids a JSON
 * parser or Arrow/Flatbuffers runtime in the browser.
 */

export type ChatWireMessage = {
  type: string;
  status?: string;
  operation?: string;
  client_message_id?: string;
  message_id?: string;
  thread_id?: string;
  content?: string;
  expected_row_version?: number | string;
  error?: string;
  message?: Record<string, unknown>;
};

const MAGIC_A = 0x43;
const MAGIC_B = 0x33;
const VERSION = 1;
const MAX_STRING_BYTES = 16 * 1024 * 1024;
const fields = [
  'type', 'status', 'operation', 'client_message_id', 'message_id', 'thread_id', 'content', 'error', 'expected_row_version',
  'message_message_id', 'message_thread_id', 'message_sender_id', 'message_sender_name',
  'message_body', 'message_created_at', 'message_attachment_id',
  'message_attachment_file_name', 'message_attachment_mime_type', 'message_attachment_size_bytes',
] as const;
const numericField = fields.indexOf('message_attachment_size_bytes');

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function fieldValue(message: ChatWireMessage, field: string, index: number): unknown {
  if (field === 'expected_row_version') return message.expected_row_version;
  if (index >= 8) {
    const key = field === 'message_message_id' ? 'id' : field.slice('message_'.length);
    return message.message?.[key];
  }
  return message[field as keyof ChatWireMessage];
}

function asBytes(raw: ArrayBuffer | Uint8Array): Uint8Array {
  return raw instanceof Uint8Array ? raw : new Uint8Array(raw);
}

export function encodeChatFrame(message: ChatWireMessage): Uint8Array {
  const values = fields.map((field, index) => fieldValue(message, field, index));
  let bitmap = 0;
  const encoded: Array<Uint8Array | number> = [];
  let size = 8;
  values.forEach((value, index) => {
    if (value === undefined || value === null) return;
    bitmap |= 1 << index;
    if (index === numericField) {
      const number = Number(value);
      if (!Number.isFinite(number)) throw new TypeError('Invalid attachment size');
      encoded.push(number);
      size += 8;
    } else {
      const bytes = encoder.encode(String(value));
      if (bytes.byteLength > MAX_STRING_BYTES) throw new RangeError('Chat field is too large');
      encoded.push(bytes);
      size += 4 + bytes.byteLength;
    }
  });

  const output = new Uint8Array(size);
  const view = new DataView(output.buffer);
  output[0] = MAGIC_A; output[1] = MAGIC_B; output[2] = VERSION;
  view.setUint32(4, bitmap, true);
  let offset = 8;
  let encodedIndex = 0;
  values.forEach((value, index) => {
    if (value === undefined || value === null) return;
    const item = encoded[encodedIndex++];
    if (index === numericField) {
      view.setFloat64(offset, item as number, true); offset += 8;
    } else {
      const bytes = item as Uint8Array;
      view.setUint32(offset, bytes.byteLength, true); offset += 4;
      output.set(bytes, offset); offset += bytes.byteLength;
    }
  });
  return output;
}

export function decodeChatFrame(raw: ArrayBuffer | Uint8Array): ChatWireMessage {
  const bytes = asBytes(raw);
  if (bytes.byteLength < 8 || bytes[0] !== MAGIC_A || bytes[1] !== MAGIC_B || bytes[2] !== VERSION) {
    throw new Error('Invalid chat binary frame');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const bitmap = view.getUint32(4, true);
  const row: Record<string, unknown> = {};
  let offset = 8;
  for (let index = 0; index < fields.length; index++) {
    if ((bitmap & (1 << index)) === 0) continue;
    if (index === numericField) {
      if (offset + 8 > bytes.byteLength) throw new Error('Truncated chat binary frame');
      row[fields[index]] = view.getFloat64(offset, true); offset += 8;
      continue;
    }
    if (offset + 4 > bytes.byteLength) throw new Error('Truncated chat binary frame');
    const length = view.getUint32(offset, true); offset += 4;
    if (length > MAX_STRING_BYTES || offset + length > bytes.byteLength) throw new Error('Invalid chat field length');
    row[fields[index]] = decoder.decode(bytes.subarray(offset, offset + length));
    offset += length;
  }
  if (offset !== bytes.byteLength) throw new Error('Trailing chat binary data');

  const message: Record<string, unknown> = {};
  for (const field of fields) {
    if (!field.startsWith('message_') || fields.indexOf(field) < 8 || row[field] === undefined) continue;
    message[field === 'message_message_id' ? 'id' : field.slice('message_'.length)] = row[field];
  }
  const result: ChatWireMessage = {
    type: String(row.type || ''), status: row.status as string | undefined, operation: row.operation as string | undefined,
    client_message_id: row.client_message_id as string | undefined, message_id: row.message_id as string | undefined,
    thread_id: row.thread_id as string | undefined, content: row.content as string | undefined, error: row.error as string | undefined,
    expected_row_version: row.expected_row_version as number | undefined,
  };
  if (Object.keys(message).length) result.message = message;
  return result;
}
