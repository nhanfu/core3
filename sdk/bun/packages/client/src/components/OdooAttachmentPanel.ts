import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';
import { html } from '@core3/client/html';

function formatSize(value: unknown) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export class OdooAttachmentPanel extends BaseComponent {
  private readonly objectUrls = new Map<string, string>();
  private readonly pendingUrls = new Map<string, Promise<string>>();
  private previewOverlay: HTMLElement | null = null;
  private previewKeyHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(id: string, state: any = {}, private readonly def: any = {}) {
    super(id, state);
  }

  draw(container: HTMLElement) {
    const record = this.state.record || {};
    const attachments = Array.isArray(this.state.attachments) ? this.state.attachments : [];
    const root = html.take(container).section.className('o-form-attachment-panel').getContext() as HTMLElement;

    if (this.def.attachment_upload_action) {
      const upload = html.take(root).button.type('button').className('o-form-chatter-menu-action o-form-attachment-upload').getContext() as HTMLButtonElement;
      appendIcon(upload, 'plus');
      html.take(upload).text(String(this.def.add_attachment_label || 'Attach files'));
      const input = html.take(root).input.type('file').prop('multiple', true).prop('hidden', true)
        .attr('accept', this.def.attachment_accept ? String(this.def.attachment_accept) : '').getContext() as HTMLInputElement;
      const status = html.take(root).span.className('o-form-attachment-upload-status').attr('aria-live', 'polite').getContext() as HTMLSpanElement;
      html.take(upload).event('click', () => input.click());
      html.take(input).event('change', () => {
        const files = [...(input.files || [])];
        if (!files.length) return;
        upload.disabled = true;
        status.textContent = String(this.def.uploading_label || 'Uploading…');
        void (async () => {
          for (const file of files) {
            await this.submit(String(this.def.attachment_upload_action), { id: record.id, file });
          }
          status.textContent = '';
          input.value = '';
        })().catch(error => {
          status.textContent = error instanceof Error ? error.message : String(this.def.upload_failed_label || 'Upload failed');
        }).finally(() => { upload.disabled = false; });
      });
    }

    if (!attachments.length) {
      html.take(root).p.className('o-form-chatter-empty').text(String(this.def.no_attachments_label || 'No attachments'));
      return;
    }

    const list = html.take(root).div.className('o-form-attachment-list').attr('role', 'list').getContext() as HTMLDivElement;
    for (const attachment of attachments) this.renderAttachment(attachment, list);
  }

  private renderAttachment(attachment: any, parent: HTMLElement) {
    const item = html.take(parent).article.className('o-form-attachment-card').attr('role', 'listitem').getContext() as HTMLElement;
    const mime = String(attachment.mime_type || 'application/octet-stream');
    const isImage = mime.startsWith('image/');
    const preview = html.take(item).button.type('button').className(`o-form-attachment-preview-button${isImage ? ' is-image' : ''}`)
      .attr('aria-label', `${isImage ? this.def.preview_label || 'Preview' : this.def.download_label || 'Download'} ${attachment.file_name || 'attachment'}`).getContext() as HTMLButtonElement;
    if (isImage && typeof this.def.resolve_attachment_blob === 'function') {
      const placeholder = html.take(preview).span.className('o-form-attachment-placeholder').getContext() as HTMLSpanElement;
      appendIcon(placeholder, 'image');
      const image = html.take(preview).img.attr('alt', String(attachment.file_name || 'Image attachment')).prop('hidden', true).getContext() as HTMLImageElement;
      void this.getObjectUrl(attachment).then(url => {
        if (!image.isConnected) return;
        image.src = url;
        image.hidden = false;
        placeholder.hidden = true;
      }).catch(() => {});
      html.take(preview).event('click', () => void this.openPreview(attachment));
    } else {
      const icon = html.take(preview).span.className('o-form-attachment-file-icon').getContext() as HTMLSpanElement;
      appendIcon(icon, isImage ? 'image' : 'file');
      if (this.def.attachment_download_action) html.take(preview).event('click', () => void this.download(attachment));
      else preview.disabled = true;
    }
    const info = html.take(item).div.className('o-form-attachment-info').getContext() as HTMLDivElement;
    const name = html.take(info).strong.text(String(attachment.file_name || attachment.name || 'Attachment')).getContext() as HTMLElement;
    name.title = name.textContent || '';
    html.take(info).small.text(formatSize(attachment.size_bytes) || mime);
    if (this.def.attachment_download_action) {
      const download = html.take(item).button.type('button').className('o-form-attachment-download')
        .attr('title', String(this.def.download_label || 'Download'))
        .attr('aria-label', `${this.def.download_label || 'Download'}: ${name.textContent}`).getContext() as HTMLButtonElement;
      appendIcon(download, 'download');
      html.take(download).event('click', () => void this.download(attachment));
    }
    return item;
  }

  private attachmentKey(attachment: any) {
    return String(attachment.id || attachment.file_name || 'attachment');
  }

  private getObjectUrl(attachment: any): Promise<string> {
    const key = this.attachmentKey(attachment);
    const existing = this.objectUrls.get(key);
    if (existing) return Promise.resolve(existing);
    const pending = this.pendingUrls.get(key);
    if (pending) return pending;
    const request = Promise.resolve(this.def.resolve_attachment_blob(attachment)).then((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      this.objectUrls.set(key, url);
      this.pendingUrls.delete(key);
      return url;
    }).catch((error: unknown) => {
      this.pendingUrls.delete(key);
      throw error;
    });
    this.pendingUrls.set(key, request);
    return request;
  }

  private async openPreview(attachment: any) {
    const url = await this.getObjectUrl(attachment);
    this.closePreview();
    const overlay = html.take(document.body).div.className('o-form-attachment-preview-overlay')
      .attr('role', 'dialog').attr('aria-modal', 'true')
      .attr('aria-label', String(attachment.file_name || this.def.preview_label || 'Attachment preview'))
      .prop('tabIndex', -1).getContext() as HTMLDivElement;
    const dialog = html.take(overlay).div.className('o-form-attachment-preview-dialog').getContext() as HTMLDivElement;
    const close = html.take(dialog).button.type('button').className('o-form-attachment-preview-close')
      .attr('title', String(this.def.close_label || 'Close'))
      .attr('aria-label', String(this.def.close_label || 'Close')).getContext() as HTMLButtonElement;
    appendIcon(close, 'x');
    html.take(dialog).img.attr('src', url).attr('alt', String(attachment.file_name || 'Image attachment'));
    const footer = html.take(dialog).div.className('o-form-attachment-preview-footer').getContext() as HTMLDivElement;
    html.take(footer).strong.text(String(attachment.file_name || 'Attachment'));
    if (this.def.attachment_download_action) {
      html.take(footer).button.type('button').className('o-form-chatter-menu-confirm')
        .text(String(this.def.download_label || 'Download'))
        .event('click', () => void this.download(attachment));
    }
    html.take(close).event('click', () => this.closePreview());
    html.take(overlay).event('click', event => { if (event.target === overlay) this.closePreview(); });
    this.previewKeyHandler = event => { if (event.key === 'Escape') this.closePreview(); };
    document.addEventListener('keydown', this.previewKeyHandler);
    this.previewOverlay = overlay;
    overlay.focus();
  }

  private download(attachment: any) {
    return this.submit(String(this.def.attachment_download_action), { ...attachment });
  }

  private closePreview() {
    this.previewOverlay?.remove();
    this.previewOverlay = null;
    if (this.previewKeyHandler) document.removeEventListener('keydown', this.previewKeyHandler);
    this.previewKeyHandler = null;
  }

  dispose() {
    this.closePreview();
    for (const url of this.objectUrls.values()) URL.revokeObjectURL(url);
    this.objectUrls.clear();
    this.pendingUrls.clear();
    super.dispose();
  }
}
