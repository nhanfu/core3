import { BaseComponent } from '@core3/client/components/BaseComponent';
import { i18n } from '@core3/client/i18n';
import { decodeChatFrame, encodeChatFrame } from '@core3/client/chat-wire';
import { html } from '@core3/client/html';

function formatTimestamp(value: unknown) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.valueOf())) return String(value);
  return new Intl.DateTimeFormat(i18n.lang || 'en', {
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
      const fallback = payload.error || i18n.tKey('errors.message_failed', {}, 'Message failed');
      remaining.push({
        ...pending,
        pending: false,
        failed: true,
        error: payload.error_message_key ? i18n.tKey(payload.error_message_key, {}, fallback) : fallback,
        error_code: payload.error_code,
      });
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
    const root = html.take(container).section.className('chat-workspace grid min-h-[560px] overflow-hidden rounded-md border').css('height', 'calc(100vh - 204px)').css('gridTemplateColumns', 'minmax(250px, 320px) minmax(0, 1fr)').ele() as HTMLElement;

    const sidebar = html.take(root).aside.className('chat-sidebar flex min-w-0 flex-col border-r').ele() as HTMLElement;
    const sidebarHeader = html.take(sidebar).div.className('chat-sidebar-header').ele() as HTMLElement;
    html.take(sidebarHeader).strong.className('chat-sidebar-title').text(i18n.tKey('chat.messages', {}, 'Messages'));
    const search = html.take(sidebarHeader).input.className('chat-search form-input w-full').ele() as HTMLInputElement;
    html.take(search).type('search').prop('value', String(this.state.query || ''));
    const searchPlaceholder = String(this.def.search_placeholder || 'Search conversations...');
    html.take(search).prop('placeholder', searchPlaceholder).attr('aria-label', searchPlaceholder);
    const threadList = html.take(sidebar).div.className('chat-thread-list min-h-0 flex-1 overflow-y-auto').ele() as HTMLElement;

    const renderThreads = () => {
      html.take(threadList).clear();
      const query = String(this.state.query || '').trim().toLocaleLowerCase();
      const visibleThreads = threads.filter((thread: any) =>
        !query
        || String(thread.title || '').toLocaleLowerCase().includes(query)
        || String(thread.participant_names || '').toLocaleLowerCase().includes(query)
        || String(thread.preview || '').toLocaleLowerCase().includes(query)
      );
      if (!visibleThreads.length) {
        html.take(threadList).p.className('chat-empty px-5 py-10 text-center text-sm').text(String(this.def.empty_threads || 'No conversations'));
        return;
      }

      for (const thread of visibleThreads) {
        const button = html.take(threadList).button.className(`chat-thread w-full border-b px-3 py-3 text-left transition-colors ${
            thread.id === this.state.activeThreadId
              ? 'is-active'
              : ''
          }`).type('button').attr('aria-label', `Mở cuộc trò chuyện ${thread.title}`).ele() as HTMLButtonElement;

        const identity = html.take(button).div.className('chat-thread-identity').ele() as HTMLElement;
        html.take(identity).span.className('chat-avatar').text(initials(thread.title));
        const heading = html.take(identity).div.className('chat-thread-heading').ele() as HTMLElement;
        html.take(heading).strong.className('min-w-0 truncate').text(String(thread.title || 'Conversation'));
        html.take(heading).span.className('chat-thread-time').text(formatTimestamp(thread.updated_at));
        html.take(button).div.className('chat-thread-participants truncate text-xs').text(String(thread.participant_names || ''));

        const preview = html.take(button).div.className('chat-thread-preview flex items-center gap-2').ele() as HTMLElement;
        html.take(preview).span.className('min-w-0 flex-1 truncate text-xs').text(String(thread.preview || ''));
        if (Number(thread.unread_count) > 0) {
          html.take(preview).span.className('chat-unread flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold').text(String(thread.unread_count));
        }
        html.take(button).event('click', async () => {
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
      }
    };

    html.take(search).event('input', () => {
      this.state.query = search.value;
      renderThreads();
    });
    renderThreads();

    const main = html.take(root).div.className('chat-main flex min-w-0 flex-col').ele() as HTMLElement;
    if (!activeThread) {
      html.take(main).div.className('chat-empty flex flex-1 items-center justify-center p-8 text-center text-sm').text(String(this.def.empty_messages || i18n.tKey('chat.select_conversation', {}, 'Select a conversation')));
      return;
    }

    const mainHeader = html.take(main).header.className('chat-header').ele() as HTMLElement;
    const headerIdentity = html.take(mainHeader).div.className('chat-header-identity').ele() as HTMLElement;
    html.take(headerIdentity).span.className('chat-avatar chat-avatar-lg').text(initials(activeThread.title));
    const headerCopy = html.take(headerIdentity).div.className('min-w-0').ele() as HTMLElement;
    html.take(headerCopy).h2.className('truncate').text(String(activeThread.title || ''));
    html.take(headerCopy).p.className('truncate').text(String(activeThread.participant_names || ''));
    html.take(mainHeader).span.className('chat-online-status').text(`● ${i18n.tKey('chat.active_conversation', {}, 'Active conversation')}`);

    const messageList = html.take(main).div.className('chat-message-list flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5').ele() as HTMLElement;
    const activeMessages = [
      ...messages.filter((message: any) => message.thread_id === activeThread.id),
      ...pendingMessages.filter((message: any) => message.thread_id === activeThread.id),
    ];
    if (!activeMessages.length) {
      html.take(messageList).p.className('chat-empty m-auto text-sm').text(i18n.tKey('chat.empty_messages', {}, 'No messages yet. Start the conversation.'));
    }
    for (const message of activeMessages) {
      const row = html.take(messageList).article.className(`chat-message flex flex-col ${message.is_own ? 'is-own items-end' : 'items-start'}`).ele() as HTMLElement;
      const messageMeta = html.take(row).div.className('chat-message-meta').ele() as HTMLElement;
      html.take(messageMeta).span.className('chat-avatar chat-avatar-sm').text(initials(message.sender_name));
      const messageMetaCopy = html.take(messageMeta).span.className('chat-message-meta-copy').ele() as HTMLElement;
      html.take(messageMetaCopy).strong.text(String(message.sender_name || 'Unknown'));
      html.take(messageMetaCopy).time.text(formatTimestamp(message.created_at));
      html.take(row).div.className(`chat-bubble max-w-[76%] whitespace-pre-wrap break-words px-3 py-2 text-sm ${message.is_own ? 'is-own' : ''}`).text(String(message.body || ''));
      if (message.pending || message.failed) {
        const status = html.take(row).span.className(`mt-1 text-[11px] ${message.failed ? 'text-red-500' : 'text-slate-400'}`).text(message.failed ? `✕ ${message.error || i18n.tKey('labels.failed', {}, 'Failed')}` : `⟳ ${i18n.tKey('labels.sending', {}, 'Sending')}`).ele() as HTMLElement;
        if (message.pending) html.take(status).toggleClass('animate-pulse', true);
      }
      const messageAttachments = attachments.filter(
        (attachment: any) => attachment.message_id === message.id,
      );
      if (messageAttachments.length) {
        const attachmentRow = html.take(row).div.className('mt-1 flex flex-wrap justify-end gap-1').ele() as HTMLElement;
        for (const attachment of messageAttachments) {
          const attachmentId = String(attachment.id || '');
          if (isPreviewableImage(attachment)) {
            const previewUrl = this.attachmentPreviewUrls.get(attachmentId);
            if (previewUrl) {
              const image = html.take(attachmentRow).img.className('chat-image-preview max-h-48 max-w-[280px] rounded-md border object-contain').attr('src', previewUrl).attr('alt', String(attachment.file_name || i18n.tKey('files.image_attachment', {}, 'Image attachment'))).attr('loading', 'lazy').ele() as HTMLImageElement;
              html.take(image).event('click', () => {
                if (this.def.download_action) void this.submit(this.def.download_action, { row: { id: attachment.id, file_name: attachment.file_name } });
              });

            } else {
              html.take(attachmentRow).span.className('chat-image-preview-loading text-xs text-slate-400').text(i18n.tKey('labels.loading_image', {}, 'Loading image…'));
              void this.loadAttachmentPreview(attachment);
            }
          }
          const attachmentButton = html.take(attachmentRow).button.className('chat-attachment rounded-full border px-2 py-1 text-[11px]').text(`Tệp: ${attachment.file_name}`).ele() as HTMLButtonElement;
          html.take(attachmentButton).type('button').event('click', () => {
            if (this.def.download_action) {
              void this.submit(this.def.download_action, {
                row: { id: attachment.id, file_name: attachment.file_name },
              });
            }
          });
        }
      }
    }

    requestAnimationFrame(() => {
      messageList.scrollTop = messageList.scrollHeight;
    });

    if (this.state.selectedFile) html.take(main).div.className('chat-selected-file border-t px-4 pb-2 text-xs').text(`${i18n.tKey('files.selected', {}, 'Selected file')}: ${this.state.selectedFile.name}`);
    const composer = html.take(main).form.className('chat-composer flex items-end gap-2').ele() as HTMLElement;
    const fileInput = html.take(composer).input.type('file').prop('hidden', true).attr('aria-label', i18n.tKey('files.attach', {}, 'Attach file')).ele() as HTMLInputElement;
    const attachButton = html.take(composer).button.className('chat-attach btn btn-secondary flex-none').text(this.state.selectedFile ? i18n.tKey('files.change', {}, 'Change file') : i18n.tKey('files.attach', {}, 'Attach file')).ele() as HTMLButtonElement;
    html.take(attachButton).type('button').event('click', () => html.take(fileInput).click());
    const input = html.take(composer).textarea.className('chat-input form-input flex-1 resize-none').ele() as HTMLTextAreaElement;
    html.take(input).prop('rows', 1).prop('maxLength', 4000).prop('placeholder', i18n.tKey('chat.message_placeholder', {}, 'Type a message…'))
      .attr('aria-label', i18n.tKey('chat.message_label', {}, 'Message content')).prop('value', String(this.state.inputValue || ''));
    html.take(composer).button.type('submit').className('chat-send btn btn-primary flex-none').text(i18n.tKey('labels.send', {}, 'Send'));
    html.take(fileInput).event('change', () => {
      const file = fileInput.files?.[0] || null;
      if (file && file.size > 5 * 1024 * 1024) {
        alert('Tệp đính kèm không được vượt quá 5 MB');
        html.take(fileInput).prop('value', '');
        return;
      }
      this.state.selectedFile = file;
      this.redraw();
    });
    html.take(input).event('input', () => {
      this.state.inputValue = input.value;
    });
    html.take(input).event('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        composer.requestSubmit();
      }
    });
    const refocusInput = () => {
      const focusCurrentInput = () => {
        const currentInput = this._container?.querySelector<HTMLTextAreaElement>('.chat-input');
        if (currentInput) html.take(currentInput).focus();
      };
      focusCurrentInput();
      requestAnimationFrame(focusCurrentInput);
    };
    html.take(composer).event('submit', async (event) => {
      event.preventDefault();
      const content = input.value.trim();
      const file = this.state.selectedFile;
      if (!content && !file) return;
      this.state.inputValue = '';
      this.state.selectedFile = null;
      if (file && this.def.upload_action) {
          const result = await this.submit(this.def.upload_action, {
          row: { id: activeThread.id, content, file, expected_row_version: activeThread.row_version },
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
          await this.submit(this.def.send_action, { row: { id: activeThread.id, content, expected_row_version: activeThread.row_version } });
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
            expected_row_version: activeThread.row_version,
          }));
        } else {
          void this.submit(this.def.send_action, {
            row: { id: activeThread.id, content, client_message_id: clientMessageId, expected_row_version: activeThread.row_version },
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
            error: String(error?.message || i18n.tKey('errors.message_failed', {}, 'Message failed')),
            error_code: error?.code,
            error_message_key: error?.message_key,
            });
          });
        }
        refocusInput();
      }
    });
  }
}
