import { BaseComponent } from './BaseComponent.ts';

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function formatTimestamp(value: unknown) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.valueOf())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export class ChatWorkspace extends BaseComponent {
  def: any;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private streamAbort: AbortController | null = null;
  private streamRetry: ReturnType<typeof setTimeout> | null = null;

  constructor(id: string, state: any = {}, def: any = {}) {
    super(id, {
      threads: [],
      messages: [],
      attachments: [],
      activeThreadId: null,
      query: '',
      inputValue: '',
      selectedFile: null,
      ...state,
    });
    this.def = def;
  }

  private startRefreshTimer() {
    if (this.def.sse?.endpoint) return this.startEventStream();
    const interval = Number(this.def.refresh_interval_ms || 0);
    if (interval < 1000 || this.refreshTimer || typeof this.def.on_refresh !== 'function') return;
    this.refreshTimer = setInterval(() => {
      void Promise.resolve(this.def.on_refresh()).catch(() => {});
    }, interval);
  }

  private startEventStream() {
    if (this.streamAbort || typeof fetch !== 'function') return;
    const endpoint = String(this.def.sse.endpoint);
    const connect = async () => {
      if (this.streamAbort) return;
      const controller = new AbortController();
      this.streamAbort = controller;
      try {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('tms_token') : null;
        const response = await fetch(endpoint, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error(`SSE connection failed: ${response.status}`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!controller.signal.aborted) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          for (const event of events) {
            const data = event.split('\n')
              .filter(line => line.startsWith('data:'))
              .map(line => line.slice(5).trim())
              .join('\n');
            if (!data) continue;
            let payload: any = null;
            try { payload = JSON.parse(data); } catch { /* keep refresh fallback */ }
            if (payload?.sources && typeof this.def.on_sse === 'function') this.def.on_sse(payload);
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          this.streamRetry = setTimeout(() => {
            this.streamRetry = null;
            this.streamAbort = null;
            void connect();
          }, 3000);
        }
      } finally {
        if (this.streamAbort === controller && !this.streamRetry) this.streamAbort = null;
      }
    };
    void connect();
  }

  dispose() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.streamRetry) clearTimeout(this.streamRetry);
    this.streamAbort?.abort();
    this.refreshTimer = null;
    this.streamRetry = null;
    this.streamAbort = null;
    super.dispose();
  }

  draw(container: HTMLElement) {
    this.startRefreshTimer();
    const threads = Array.isArray(this.state.threads) ? this.state.threads : [];
    const messages = Array.isArray(this.state.messages) ? this.state.messages : [];
    const attachments = Array.isArray(this.state.attachments) ? this.state.attachments : [];
    if (!threads.some((thread: any) => thread.id === this.state.activeThreadId)) {
      this.state.activeThreadId = threads[0]?.id || null;
    }

    const activeThread = threads.find((thread: any) => thread.id === this.state.activeThreadId);
    const root = createElement(
      'section',
      'grid min-h-[560px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm',
    );
    root.style.height = 'calc(100vh - 204px)';
    root.style.gridTemplateColumns = 'minmax(250px, 320px) minmax(0, 1fr)';
    container.appendChild(root);

    const sidebar = createElement('aside', 'flex min-w-0 flex-col border-r border-slate-200 bg-slate-50/70');
    const sidebarHeader = createElement('div', 'border-b border-slate-200 p-4');
    const search = createElement('input', 'form-input w-full bg-white');
    search.type = 'search';
    search.value = String(this.state.query || '');
    search.placeholder = String(this.def.search_placeholder || 'Search conversations...');
    search.setAttribute('aria-label', search.placeholder);
    sidebarHeader.appendChild(search);
    sidebar.appendChild(sidebarHeader);
    const threadList = createElement('div', 'min-h-0 flex-1 overflow-y-auto');
    sidebar.appendChild(threadList);
    root.appendChild(sidebar);

    const renderThreads = () => {
      threadList.innerHTML = '';
      const query = String(this.state.query || '').trim().toLocaleLowerCase();
      const visibleThreads = threads.filter((thread: any) =>
        !query
        || String(thread.title || '').toLocaleLowerCase().includes(query)
        || String(thread.participant_names || '').toLocaleLowerCase().includes(query)
        || String(thread.preview || '').toLocaleLowerCase().includes(query)
      );
      if (!visibleThreads.length) {
        threadList.appendChild(createElement(
          'p',
          'px-5 py-10 text-center text-sm text-slate-400',
          String(this.def.empty_threads || 'No conversations'),
        ));
        return;
      }

      for (const thread of visibleThreads) {
        const button = createElement(
          'button',
          `w-full border-b border-slate-100 px-4 py-4 text-left transition-colors ${
            thread.id === this.state.activeThreadId
              ? 'bg-blue-50'
              : 'bg-transparent hover:bg-white'
          }`,
        );
        button.type = 'button';
        button.setAttribute('aria-label', `Mở cuộc trò chuyện ${thread.title}`);

        const heading = createElement('div', 'flex items-start justify-between gap-3');
        heading.appendChild(createElement(
          'strong',
          'min-w-0 truncate text-sm font-semibold text-slate-900',
          String(thread.title || 'Conversation'),
        ));
        heading.appendChild(createElement(
          'span',
          'flex-none text-[11px] text-slate-400',
          formatTimestamp(thread.updated_at),
        ));
        button.appendChild(heading);
        button.appendChild(createElement(
          'div',
          'mt-1 truncate text-xs text-slate-500',
          String(thread.participant_names || ''),
        ));

        const preview = createElement('div', 'mt-2 flex items-center gap-2');
        preview.appendChild(createElement(
          'span',
          'min-w-0 flex-1 truncate text-xs text-slate-500',
          String(thread.preview || ''),
        ));
        if (Number(thread.unread_count) > 0) {
          preview.appendChild(createElement(
            'span',
            'flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-semibold text-white',
            String(thread.unread_count),
          ));
        }
        button.appendChild(preview);
        button.addEventListener('click', async () => {
          this.state.activeThreadId = thread.id;
          this.redraw();
          if (Number(thread.unread_count) > 0 && this.def.mark_read_action) {
            await this.submit(this.def.mark_read_action, { row: { id: thread.id } });
          }
        });
        threadList.appendChild(button);
      }
    };

    search.addEventListener('input', () => {
      this.state.query = search.value;
      renderThreads();
    });
    renderThreads();

    const main = createElement('div', 'flex min-w-0 flex-col bg-white');
    root.appendChild(main);
    if (!activeThread) {
      main.appendChild(createElement(
        'div',
        'flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-400',
        String(this.def.empty_messages || 'Select a conversation'),
      ));
      return;
    }

    const mainHeader = createElement('header', 'border-b border-slate-200 px-5 py-4');
    mainHeader.appendChild(createElement(
      'h2',
      'text-base font-semibold text-slate-950',
      String(activeThread.title || ''),
    ));
    mainHeader.appendChild(createElement(
      'p',
      'mt-1 text-xs text-slate-500',
      String(activeThread.participant_names || ''),
    ));
    main.appendChild(mainHeader);

    const messageList = createElement('div', 'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 p-5');
    const activeMessages = messages.filter((message: any) => message.thread_id === activeThread.id);
    if (!activeMessages.length) {
      messageList.appendChild(createElement(
        'p',
        'm-auto text-sm text-slate-400',
        'Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện.',
      ));
    }
    for (const message of activeMessages) {
      const row = createElement(
        'article',
        `flex flex-col ${message.is_own ? 'items-end' : 'items-start'}`,
      );
      row.appendChild(createElement(
        'span',
        'mb-1 text-[11px] text-slate-400',
        `${message.sender_name || 'Unknown'} · ${formatTimestamp(message.created_at)}`,
      ));
      row.appendChild(createElement(
        'div',
        message.is_own
          ? 'max-w-[76%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-2.5 text-sm text-white'
          : 'max-w-[76%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm',
        String(message.body || ''),
      ));
      const messageAttachments = attachments.filter(
        (attachment: any) => attachment.message_id === message.id,
      );
      if (messageAttachments.length) {
        const attachmentRow = createElement('div', 'mt-1 flex flex-wrap justify-end gap-1');
        for (const attachment of messageAttachments) {
          const attachmentButton = createElement(
            'button',
            'rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:border-blue-300 hover:text-blue-700',
            `Tệp: ${attachment.file_name}`,
          );
          attachmentButton.type = 'button';
          attachmentButton.addEventListener('click', () => {
            if (this.def.download_action) {
              void this.submit(this.def.download_action, {
                row: { id: attachment.id, file_name: attachment.file_name },
              });
            }
          });
          attachmentRow.appendChild(attachmentButton);
        }
        row.appendChild(attachmentRow);
      }
      messageList.appendChild(row);
    }
    main.appendChild(messageList);
    requestAnimationFrame(() => {
      messageList.scrollTop = messageList.scrollHeight;
    });

    const composer = createElement('form', 'flex items-end gap-2 border-t border-slate-200 bg-white p-4');
    const fileInput = createElement('input');
    fileInput.type = 'file';
    fileInput.hidden = true;
    fileInput.setAttribute('aria-label', 'Chọn tệp đính kèm');
    const attachButton = createElement(
      'button',
      'btn btn-secondary min-h-11 flex-none',
      this.state.selectedFile ? 'Đổi tệp' : 'Đính kèm',
    );
    attachButton.type = 'button';
    attachButton.addEventListener('click', () => fileInput.click());
    const input = createElement('textarea', 'form-input min-h-11 flex-1 resize-none');
    input.rows = 1;
    input.maxLength = 4000;
    input.placeholder = 'Nhập tin nhắn...';
    input.setAttribute('aria-label', 'Nội dung tin nhắn');
    input.value = String(this.state.inputValue || '');
    const sendButton = createElement('button', 'btn btn-primary min-h-11 flex-none', 'Gửi');
    sendButton.type = 'submit';
    composer.append(fileInput, attachButton, input, sendButton);
    main.appendChild(composer);
    if (this.state.selectedFile) {
      const selected = createElement(
        'div',
        'border-t border-slate-100 bg-white px-4 pb-2 text-xs text-slate-500',
        `Tệp đã chọn: ${this.state.selectedFile.name}`,
      );
      main.insertBefore(selected, composer);
    }

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0] || null;
      if (file && file.size > 5 * 1024 * 1024) {
        alert('Tệp đính kèm không được vượt quá 5 MB');
        fileInput.value = '';
        return;
      }
      this.state.selectedFile = file;
      this.redraw();
    });
    input.addEventListener('input', () => {
      this.state.inputValue = input.value;
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        composer.requestSubmit();
      }
    });
    composer.addEventListener('submit', async (event) => {
      event.preventDefault();
      const content = input.value.trim();
      const file = this.state.selectedFile;
      if (!content && !file) return;
      input.disabled = true;
      attachButton.disabled = true;
      sendButton.disabled = true;
      sendButton.textContent = 'Đang gửi...';
      this.state.inputValue = '';
      this.state.selectedFile = null;
      if (file && this.def.upload_action) {
        await this.submit(this.def.upload_action, {
          row: { id: activeThread.id, content, file },
        });
      } else if (this.def.send_action) {
        await this.submit(this.def.send_action, {
          row: { id: activeThread.id, content },
        });
      }
    });
  }
}
