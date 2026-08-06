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
    attachments: [{
      id: 'attachment-1',
      message_id: 'message-1',
      file_name: 'proof.pdf',
    }],
  }, {
    send_action: 'send_message',
    upload_action: 'upload_attachment',
    download_action: 'download_attachment',
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

  it('loads messages only after selecting another thread', async () => {
    const loadMessages = vi.fn().mockResolvedValue(undefined);
    const component = new ChatWorkspace('chat-lazy', {
      threads: [{ id: 'thread-1', title: 'One' }, { id: 'thread-2', title: 'Two' }],
      messages: [{ id: 'message-1', thread_id: 'thread-1', body: 'Recent' }],
    }, { load_messages: loadMessages });
    const container = document.createElement('div');
    component.mount(container);
    container.querySelector<HTMLButtonElement>('button[aria-label="Mở cuộc trò chuyện Two"]')!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(loadMessages).toHaveBeenCalledWith('thread-2');
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

  it('submits selected files and exposes persisted attachments', async () => {
    const { container, submit } = createWorkspace();
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(['proof'], 'proof.txt', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    const refreshedForm = container.querySelector<HTMLFormElement>('form')!;
    refreshedForm.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(submit).toHaveBeenCalledWith('upload_attachment', {
      row: { id: 'thread-1', content: '', file },
    });

    const download = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent === 'Tệp: proof.pdf')!;
    download.click();
    expect(submit).toHaveBeenCalledWith('download_attachment', {
      row: { id: 'attachment-1', file_name: 'proof.pdf' },
    });
  });

  it('previews recognized image attachments while retaining download behavior', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Blob(['image']), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:image-preview'),
      revokeObjectURL: vi.fn(),
    });
    const component = new ChatWorkspace('chat-image', {
      threads: [{ id: 'thread-1', title: 'Operations' }],
      messages: [{ id: 'message-1', thread_id: 'thread-1', body: 'Photo' }],
      attachments: [{ id: 'image-1', message_id: 'message-1', file_name: 'photo.png', mime_type: 'image/png' }],
    }, { download_action: 'download_attachment' });
    const container = document.createElement('div');
    component.mount(container);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchMock).toHaveBeenCalledWith('/api/chat/attachments/image-1', { headers: {} });
    expect(container.querySelector('img.tms-chat-image-preview')?.getAttribute('alt')).toBe('photo.png');
    component.dispose();
    vi.restoreAllMocks();
  });

  it('refreshes on the configured interval and stops after disposal', async () => {
    vi.useFakeTimers();
    const refresh = vi.fn().mockResolvedValue(undefined);
    const component = new ChatWorkspace('chat-refresh', {
      threads: [],
    }, {
      refresh_interval_ms: 1000,
      on_refresh: refresh,
    });
    const container = document.createElement('div');
    component.mount(container);

    await vi.advanceTimersByTimeAsync(1000);
    expect(refresh).toHaveBeenCalledTimes(1);
    component.dispose();
    await vi.advanceTimersByTimeAsync(2000);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
