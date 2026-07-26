import { describe, expect, it, vi } from 'vitest';
import { ChatWorkspace } from '../../components/ChatWorkspace.ts';

function createWorkspace() {
  const submit = vi.fn().mockResolvedValue({ ok: true });
  const component = new ChatWorkspace('chat', {
    threads: [
      {
        id: 'thread-1',
        title: 'Operations',
        participant_names: 'Dispatcher',
        preview: 'Truck assigned',
        unread_count: 0,
      },
      {
        id: 'thread-2',
        title: 'Finance',
        participant_names: 'Accountant',
        preview: 'Invoice ready',
        unread_count: 2,
      },
    ],
    messages: [
      {
        id: 'message-1',
        thread_id: 'thread-1',
        sender_name: 'Dispatcher',
        body: 'Truck assigned',
        is_own: false,
      },
    ],
  }, {
    send_action: 'send_message',
    mark_read_action: 'mark_read',
    search_placeholder: 'Search threads',
  });
  component._transport = { submit };
  const container = document.createElement('div');
  component.mount(container);
  return { component, container, submit };
}

describe('ChatWorkspace', () => {
  it('filters threads and marks an unread selection as read', async () => {
    const { container, submit } = createWorkspace();
    const search = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'Finance';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    const visibleThreadButtons = container.querySelectorAll('button[aria-label^="Mở cuộc trò chuyện"]');
    expect(visibleThreadButtons).toHaveLength(1);
    expect(visibleThreadButtons[0].getAttribute('aria-label')).toContain('Finance');

    container.querySelector<HTMLButtonElement>('button[aria-label="Mở cuộc trò chuyện Finance"]')!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(submit).toHaveBeenCalledWith('mark_read', { row: { id: 'thread-2' } });
  });

  it('submits trimmed composer content for the active thread', async () => {
    const { container, submit } = createWorkspace();
    const input = container.querySelector<HTMLTextAreaElement>('textarea')!;
    input.value = '  Persistent message  ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    container.querySelector<HTMLFormElement>('form')!.dispatchEvent(
      new SubmitEvent('submit', { bubbles: true, cancelable: true }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(submit).toHaveBeenCalledWith('send_message', {
      row: { id: 'thread-1', content: 'Persistent message' },
    });
  });
});
