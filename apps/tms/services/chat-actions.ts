export type ChatActionDefinition = {
  operation: 'create_thread' | 'send_message' | 'mark_read';
  permission: string;
};

export const CHAT_ACTION_REGISTRY: Record<string, ChatActionDefinition> = {
  'chat.threads.create': {
    operation: 'create_thread',
    permission: 'chat.write',
  },
  'chat.messages.send': {
    operation: 'send_message',
    permission: 'chat.write',
  },
  'chat.threads.mark_read': {
    operation: 'mark_read',
    permission: 'chat.read',
  },
};
