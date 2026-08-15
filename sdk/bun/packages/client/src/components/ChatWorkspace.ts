import { BaseComponent } from '@core3/client/components/BaseComponent';
import { decodeChatFrame, encodeChatFrame } from '@core3/client/chat-wire';
import { html } from '@core3/client/html';

function createFluentElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  return html.take(null).add(tag).className(className).text(text).getContext() as HTMLElementTagNameMap[K];
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

function initials(value: unknown) {
  const words = String(value || '?').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map(word => word[0]?.toUpperCase()).join('') || '?';
}

function isPreviewableImage(attachment: any): boolean {
  const mime = String(attachment?.mime_type || '').toLowerCase();
  if (['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/avif'].includes(mime)) return true;
  return /\.(?:jpe?g|png|gif|webp|bmp|avif)$/i.test(String(attachment?.file_name || ''));
}

export class ChatWorkspace extends BaseComponent {
  def: any;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private chatSocket: WebSocket | null = null;
  private streamRetry: ReturnType<typeof setTimeout> | null = null;
  private chatSocketDisposed = false;
  private readonly attachmentPreviewUrls = new Map<string, string>();
  private readonly attachmentPreviewLoading = new Set<string>();

  constructor(id: string, state: any = {}, def: any = {}) {
    super(id, {
      threads: [],
      messages: [],
      pendingMessages: [],
      attachments: [],
      activeThreadId: null,
      query: '',
      inputValue: '',
      selectedFile: null,
      ...state,
    });
    this.def = def;
  }

  handleChatAck(payload: any) {
    const clientMessageId = String(payload?.client_message_id || '');
    const pending = (this.state.pendingMessages || []).find(
      (message: any) => message.client_message_id === clientMessageId,
    );
    if (!pending) return;
    const remaining = (this.state.pendingMessages || []).filter(
      (message: any) => message.client_message_id !== clientMessageId,
    );
    if (payload.status === 'success') {
      this.state.messages = [
        ...(this.state.messages || []),
        { ...pending, id: payload.message_id || pending.id, pending: false, client_message_id: undefined },
      ];
    } else {
      remaining.push({ ...pending, pending: false, failed: true, error: payload.error || 'Message failed' });
    }
    this.state.pendingMessages = remaining;
    this.redraw();
  }

  handleChatMessage(message: any) {
    if (!message?.id || (this.state.messages || []).some((item: any) => item.id === message.id)) return;
    this.state.messages = [...(this.state.messages || []), {
      ...message,
      is_own: String(message.sender_id) === String(this.state.currentUserId || ''),
    }];
    if (message.attachment?.id) {
      this.state.attachments = [
        ...(this.state.attachments || []).filter((item: any) => item.id !== message.attachment.id),
        message.attachment,
      ];
    }
    this.state.threads = (this.state.threads || []).map((thread: any) => thread.id === message.thread_id
      ? { ...thread, preview: message.body, updated_at: message.created_at }
      : thread);
    this.redraw();
  }

  private startRefreshTimer() {
    if (this.def.websocket?.endpoint) return this.startWebSocket();
    const interval = Number(this.def.refresh_interval_ms || 0);
    if (interval < 1000 || this.refreshTimer || typeof this.def.on_refresh !== 'function') return;
    this.refreshTimer = setInterval(() => {
      void Promise.resolve(this.def.on_refresh()).catch(() => {});
    }, interval);
  }

  private startWebSocket() {
    if (this.chatSocket || this.chatSocketDisposed || typeof WebSocket === 'undefined') return;
    this.chatSocketDisposed = false;
    const connect = () => {
      const configured = String(this.def.websocket.endpoint);
      const endpoint = configured.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('core3_token') : null;
      const url = new URL(endpoint, window.location.origin);
      if (token) url.searchParams.set('token', token);
      const socket = new WebSocket(url.toString());
      socket.binaryType = 'arraybuffer';
      this.chatSocket = socket;
      socket.onmessage = (event) => {
        let payload: any = null;
        try { payload = decodeChatFrame(event.data); } catch { return; }
        if (payload?.type === 'chat_ack') this.handleChatAck(payload);
        else if (payload?.type === 'chat_message') this.handleChatMessage(payload.message);
      };
      socket.onclose = () => {
        if (this.chatSocket !== socket) return;
        this.chatSocket = null;
        if (this.chatSocketDisposed) return;
        this.streamRetry = setTimeout(() => {
          this.streamRetry = null;
          if (!this.chatSocket) connect();
        }, 3000);
      };
      socket.onerror = () => socket.close();
    };
    connect();
  }

  private async loadAttachmentPreview(attachment: any): Promise<void> {
    const id = String(attachment?.id || '');
    if (!id || this.attachmentPreviewUrls.has(id) || this.attachmentPreviewLoading.has(id)) return;
    this.attachmentPreviewLoading.add(id);
    try {
      const apiBase = typeof window !== 'undefined' && window.__CORE3_API_BASE__
        ? window.__CORE3_API_BASE__
        : '/api';
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('core3_token') : null;
      const response = await fetch(`${apiBase}/chat/attachments/${encodeURIComponent(id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) return;
      this.attachmentPreviewUrls.set(id, URL.createObjectURL(await response.blob()));
      this.redraw();
    } catch {
      // Keep the download action available when preview loading fails.
    } finally {
      this.attachmentPreviewLoading.delete(id);
    }
  }

  dispose() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.streamRetry) clearTimeout(this.streamRetry);
    this.chatSocketDisposed = true;
    this.chatSocket?.close();
    this.refreshTimer = null;
    this.streamRetry = null;
    for (const url of this.attachmentPreviewUrls.values()) URL.revokeObjectURL(url);
    this.attachmentPreviewUrls.clear();
    this.attachmentPreviewLoading.clear();
    super.dispose();
  }

  draw(container: HTMLElement) {
    this.startRefreshTimer();
    const threads = Array.isArray(this.state.threads) ? this.state.threads : [];
    const messages = Array.isArray(this.state.messages) ? this.state.messages : [];
    const pendingMessages = Array.isArray(this.state.pendingMessages) ? this.state.pendingMessages : [];
    const attachments = Array.isArray(this.state.attachments) ? this.state.attachments : [];
    if (!threads.some((thread: any) => thread.id === this.state.activeThreadId)) {
      this.state.activeThreadId = threads[0]?.id || null;
    }

    const activeThread = threads.find((thread: any) => thread.id === this.state.activeThreadId);
    const root = createFluentElement(
      'section',
      'chat-workspace grid min-h-[560px] overflow-hidden rounded-md border',
    );
    root.style.height = 'calc(100vh - 204px)';
    root.style.gridTemplateColumns = 'minmax(250px, 320px) minmax(0, 1fr)';
    container.appendChild(root);

    const sidebar = createFluentElement('aside', 'chat-sidebar flex min-w-0 flex-col border-r');
    const sidebarHeader = createFluentElement('div', 'chat-sidebar-header');
    sidebarHeader.appendChild(createFluentElement('strong', 'chat-sidebar-title', 'Messages'));
    const search = createFluentElement('input', 'chat-search form-input w-full');
    search.type = 'search';
    search.value = String(this.state.query || '');
    search.placeholder = String(this.def.search_placeholder || 'Search conversations...');
    search.setAttribute('aria-label', search.placeholder);
    sidebarHeader.appendChild(search);
    sidebar.appendChild(sidebarHeader);
    const threadList = createFluentElement('div', 'chat-thread-list min-h-0 flex-1 overflow-y-auto');
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
        threadList.appendChild(createFluentElement(
          'p',
          'chat-empty px-5 py-10 text-center text-sm',
          String(this.def.empty_threads || 'No conversations'),
        ));
        return;
      }

      for (const thread of visibleThreads) {
        const button = createFluentElement(
          'button',
          `chat-thread w-full border-b px-3 py-3 text-left transition-colors ${
            thread.id === this.state.activeThreadId
              ? 'is-active'
              : ''
          }`,
        );
        button.type = 'button';
        button.setAttribute('aria-label', `Mở cuộc trò chuyện ${thread.title}`);

        const identity = createFluentElement('div', 'chat-thread-identity');
        identity.appendChild(createFluentElement('span', 'chat-avatar', initials(thread.title)));
        const heading = createFluentElement('div', 'chat-thread-heading');
        const headingText = createFluentElement('strong', 'min-w-0 truncate', String(thread.title || 'Conversation'));
        heading.appendChild(headingText);
        heading.appendChild(createFluentElement('span', 'chat-thread-time', formatTimestamp(thread.updated_at)));
        identity.appendChild(heading);
        button.appendChild(identity);
        button.appendChild(createFluentElement(
          'div',
          'chat-thread-participants truncate text-xs',
          String(thread.participant_names || ''),
        ));

        const preview = createFluentElement('div', 'chat-thread-preview flex items-center gap-2');
        preview.appendChild(createFluentElement(
          'span',
          'min-w-0 flex-1 truncate text-xs',
          String(thread.preview || ''),
        ));
        if (Number(thread.unread_count) > 0) {
          preview.appendChild(createFluentElement(
            'span',
            'chat-unread flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
            String(thread.unread_count),
          ));
        }
        button.appendChild(preview);
        button.addEventListener('click', async () => {
          this.state.activeThreadId = thread.id;
          this.state.messages = [];
          this.redraw();
          if (typeof this.def.load_messages === 'function') {
            await this.def.load_messages(thread.id);
          }
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

    const main = createFluentElement('div', 'chat-main flex min-w-0 flex-col');
    root.appendChild(main);
    if (!activeThread) {
      main.appendChild(createFluentElement(
        'div',
        'chat-empty flex flex-1 items-center justify-center p-8 text-center text-sm',
        String(this.def.empty_messages || 'Select a conversation'),
      ));
      return;
    }

    const mainHeader = createFluentElement('header', 'chat-header');
    const headerIdentity = createFluentElement('div', 'chat-header-identity');
    headerIdentity.appendChild(createFluentElement('span', 'chat-avatar chat-avatar-lg', initials(activeThread.title)));
    const headerCopy = createFluentElement('div', 'min-w-0');
    headerCopy.appendChild(createFluentElement('h2', 'truncate', String(activeThread.title || '')));
    headerCopy.appendChild(createFluentElement('p', 'truncate', String(activeThread.participant_names || '')));
    headerIdentity.appendChild(headerCopy);
    mainHeader.appendChild(headerIdentity);
    mainHeader.appendChild(createFluentElement('span', 'chat-online-status', '● Active conversation'));
    main.appendChild(mainHeader);

    const messageList = createFluentElement('div', 'chat-message-list flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5');
    const activeMessages = [
      ...messages.filter((message: any) => message.thread_id === activeThread.id),
      ...pendingMessages.filter((message: any) => message.thread_id === activeThread.id),
    ];
    if (!activeMessages.length) {
      messageList.appendChild(createFluentElement(
        'p',
        'chat-empty m-auto text-sm',
        'Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện.',
      ));
    }
    for (const message of activeMessages) {
      const row = createFluentElement(
        'article',
        `chat-message flex flex-col ${message.is_own ? 'is-own items-end' : 'items-start'}`,
      );
      const messageMeta = createFluentElement('div', 'chat-message-meta');
      messageMeta.appendChild(createFluentElement('span', 'chat-avatar chat-avatar-sm', initials(message.sender_name)));
      const messageMetaCopy = createFluentElement('span', 'chat-message-meta-copy');
      messageMetaCopy.appendChild(createFluentElement('strong', '', String(message.sender_name || 'Unknown')));
      messageMetaCopy.appendChild(createFluentElement('time', '', formatTimestamp(message.created_at)));
      messageMeta.appendChild(messageMetaCopy);
      row.appendChild(messageMeta);
      row.appendChild(createFluentElement(
        'div',
        `chat-bubble max-w-[76%] whitespace-pre-wrap break-words px-3 py-2 text-sm ${message.is_own ? 'is-own' : ''}`,
        String(message.body || ''),
      ));
      if (message.pending || message.failed) {
        const status = createFluentElement(
          'span',
          `mt-1 text-[11px] ${message.failed ? 'text-red-500' : 'text-slate-400'}`,
          message.failed ? `✕ ${message.error || 'Failed'}` : '⟳ Sending',
        );
        if (message.pending) status.classList.add('animate-pulse');
        row.appendChild(status);
      }
      const messageAttachments = attachments.filter(
        (attachment: any) => attachment.message_id === message.id,
      );
      if (messageAttachments.length) {
        const attachmentRow = createFluentElement('div', 'mt-1 flex flex-wrap justify-end gap-1');
        for (const attachment of messageAttachments) {
          const attachmentId = String(attachment.id || '');
          if (isPreviewableImage(attachment)) {
            const previewUrl = this.attachmentPreviewUrls.get(attachmentId);
            if (previewUrl) {
              const image = createFluentElement('img', 'chat-image-preview max-h-48 max-w-[280px] rounded-md border object-contain');
              image.src = previewUrl;
              image.alt = String(attachment.file_name || 'Image attachment');
              image.loading = 'lazy';
              image.addEventListener('click', () => {
                if (this.def.download_action) void this.submit(this.def.download_action, { row: { id: attachment.id, file_name: attachment.file_name } });
              });
              attachmentRow.appendChild(image);
            } else {
              attachmentRow.appendChild(createFluentElement('span', 'chat-image-preview-loading text-xs text-slate-400', 'Loading image...'));
              void this.loadAttachmentPreview(attachment);
            }
          }
          const attachmentButton = createFluentElement(
            'button',
            'chat-attachment rounded-full border px-2 py-1 text-[11px]',
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

    const composer = createFluentElement('form', 'chat-composer flex items-end gap-2');
    const fileInput = createFluentElement('input');
    fileInput.type = 'file';
    fileInput.hidden = true;
    fileInput.setAttribute('aria-label', 'Chọn tệp đính kèm');
    const attachButton = createFluentElement(
      'button',
      'chat-attach btn btn-secondary flex-none',
      this.state.selectedFile ? 'Đổi tệp' : 'Đính kèm',
    );
    attachButton.type = 'button';
    attachButton.addEventListener('click', () => fileInput.click());
    const input = createFluentElement('textarea', 'chat-input form-input flex-1 resize-none');
    input.rows = 1;
    input.maxLength = 4000;
    input.placeholder = 'Nhập tin nhắn...';
    input.setAttribute('aria-label', 'Nội dung tin nhắn');
    input.value = String(this.state.inputValue || '');
    const sendButton = createFluentElement('button', 'chat-send btn btn-primary flex-none', 'Gửi');
    sendButton.type = 'submit';
    composer.append(fileInput, attachButton, input, sendButton);
    main.appendChild(composer);
    if (this.state.selectedFile) {
      const selected = createFluentElement(
        'div',
        'chat-selected-file border-t px-4 pb-2 text-xs',
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
    const refocusInput = () => {
      const focusCurrentInput = () => {
        const currentInput = this._container?.querySelector<HTMLTextAreaElement>('.chat-input');
        currentInput?.focus();
      };
      focusCurrentInput();
      requestAnimationFrame(focusCurrentInput);
    };
    composer.addEventListener('submit', async (event) => {
      event.preventDefault();
      const content = input.value.trim();
      const file = this.state.selectedFile;
      if (!content && !file) return;
      this.state.inputValue = '';
      this.state.selectedFile = null;
      if (file && this.def.upload_action) {
        const result = await this.submit(this.def.upload_action, {
          row: { id: activeThread.id, content, file },
        });
        if (result?.id) {
          const message = {
            ...result,
            thread_id: result.thread_id || activeThread.id,
            sender_id: result.sender_id || this.state.currentUserId,
            sender_name: result.sender_name || this.state.currentUserName || 'You',
            is_own: true,
          };
          this.state.messages = [
            ...(this.state.messages || []).filter((item: any) => item.id !== message.id),
            message,
          ];
          if (result.attachment?.id) {
            this.state.attachments = [
              ...(this.state.attachments || []).filter((item: any) => item.id !== result.attachment.id),
              result.attachment,
            ];
          }
          this.state.threads = (this.state.threads || []).map((thread: any) => thread.id === message.thread_id
            ? { ...thread, preview: message.body, updated_at: message.created_at }
            : thread);
        }
        this.redraw();
        refocusInput();
      } else if (this.def.send_action) {
        if (!this.def.websocket?.endpoint) {
          await this.submit(this.def.send_action, { row: { id: activeThread.id, content } });
          refocusInput();
          return;
        }
        const clientMessageId = typeof crypto?.randomUUID === 'function'
          ? crypto.randomUUID()
          : `message-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        this.state.pendingMessages = [
          ...(this.state.pendingMessages || []),
          {
            id: `pending-${clientMessageId}`,
            client_message_id: clientMessageId,
            thread_id: activeThread.id,
            sender_id: this.state.currentUserId,
            sender_name: this.state.currentUserName || 'You',
            body: content,
            is_own: true,
            pending: true,
            created_at: new Date().toISOString(),
          },
        ];
        this.redraw();
        const socket = this.chatSocket;
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(encodeChatFrame({
            type: 'send_message',
            thread_id: activeThread.id,
            content,
            client_message_id: clientMessageId,
          }));
        } else {
          void this.submit(this.def.send_action, {
            row: { id: activeThread.id, content, client_message_id: clientMessageId },
          }).then((result: any) => {
            this.handleChatAck({
              status: 'success',
              client_message_id: clientMessageId,
              message_id: result?.id,
            });
          }).catch((error: any) => {
            this.handleChatAck({
              status: 'failed',
              client_message_id: clientMessageId,
              error: String(error?.message || 'Message failed'),
            });
          });
        }
        refocusInput();
      }
    });
  }
}
