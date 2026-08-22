import type { TopicDefinition } from './contracts.ts';

export type ChatActor = { id?: string | null; name: string };
export type CreateChatThreadRequest = { values: Record<string, unknown>; actor: ChatActor };
export const CHAT_THREAD_CREATE: TopicDefinition<CreateChatThreadRequest, Record<string, unknown>> = {
  topic: 'chat.thread.create', version: 1, kind: 'command',
};

export type ChatAttachmentRequest = {
  threadId: string;
  content?: unknown;
  attachment: { fileName: string; mimeType: string; sizeBytes: number; storageKey: string };
  actor: ChatActor;
};
export const CHAT_ATTACHMENT_SEND: TopicDefinition<ChatAttachmentRequest, Record<string, unknown>> = {
  topic: 'chat.attachment.send', version: 1, kind: 'command',
};
