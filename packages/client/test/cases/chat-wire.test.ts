import { describe, expect, it } from 'vitest';
import { decodeChatFrame, encodeChatFrame } from '@core3/client/chat-wire';

describe('binary chat wire', () => {
  it('round trips chat commands without Arrow IPC', () => {
    const frame = encodeChatFrame({
      type: 'send_message', thread_id: 'thread-1', content: 'Xin chào 👋', client_message_id: 'client-1',
    });
    expect(frame[0]).toBe(0x43);
    expect(frame[1]).toBe(0x33);
    expect(decodeChatFrame(frame)).toEqual({
      type: 'send_message', thread_id: 'thread-1', content: 'Xin chào 👋', client_message_id: 'client-1',
    });
  });

  it('round trips nested messages and numeric attachment metadata', () => {
    const message = {
      id: 'message-1', thread_id: 'thread-1', sender_id: 'user-1', sender_name: 'A', body: 'file',
      created_at: '2026-08-09T00:00:00.000Z', attachment_id: 'attachment-1',
      attachment_file_name: 'report.pdf', attachment_mime_type: 'application/pdf', attachment_size_bytes: 42,
    };
    expect(decodeChatFrame(encodeChatFrame({ type: 'chat_message', message }))).toEqual({ type: 'chat_message', message });
  });

  it('rejects non-binary and malformed frames', () => {
    expect(() => decodeChatFrame(new Uint8Array([123]))).toThrow('Invalid chat binary frame');
    expect(() => decodeChatFrame(encodeChatFrame({ type: 'connected' }).subarray(0, 8))).toThrow();
  });
});
