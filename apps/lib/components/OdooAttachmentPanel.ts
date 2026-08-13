import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';

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
    const root = document.createElement('section');
    root.className = 'o-form-attachment-panel';
    container.appendChild(root);

    if (this.def.attachment_upload_action) {
      const upload = document.createElement('button');
      upload.type = 'button';
      upload.className = 'o-form-chatter-menu-action o-form-attachment-upload';
      appendIcon(upload, 'plus');
      upload.append(String(this.def.add_attachment_label || 'Attach files'));
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.hidden = true;
      if (this.def.attachment_accept) input.accept = String(this.def.attachment_accept);
      const status = document.createElement('span');
      status.className = 'o-form-attachment-upload-status';
      status.setAttribute('aria-live', 'polite');
      upload.addEventListener('click', () => input.click());
      input.addEventListener('change', () => {
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
      root.append(upload, input, status);
    }

    if (!attachments.length) {
      const empty = document.createElement('p');
      empty.className = 'o-form-chatter-empty';
      empty.textContent = String(this.def.no_attachments_label || 'No attachments');
      root.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'o-form-attachment-list';
    list.setAttribute('role', 'list');
    for (const attachment of attachments) list.appendChild(this.renderAttachment(attachment));
    root.appendChild(list);
  }

  private renderAttachment(attachment: any) {
    const item = document.createElement('article');
    item.className = 'o-form-attachment-card';
    item.setAttribute('role', 'listitem');
    const mime = String(attachment.mime_type || 'application/octet-stream');
    const isImage = mime.startsWith('image/');
    const preview = document.createElement('button');
    preview.type = 'button';
    preview.className = `o-form-attachment-preview-button${isImage ? ' is-image' : ''}`;
    preview.setAttribute('aria-label', `${isImage ? this.def.preview_label || 'Preview' : this.def.download_label || 'Download'} ${attachment.file_name || 'attachment'}`);
    if (isImage && typeof this.def.resolve_attachment_blob === 'function') {
      const placeholder = document.createElement('span');
      placeholder.className = 'o-form-attachment-placeholder';
      appendIcon(placeholder, 'image');
      const image = document.createElement('img');
      image.alt = String(attachment.file_name || 'Image attachment');
      image.hidden = true;
      preview.append(placeholder, image);
      void this.getObjectUrl(attachment).then(url => {
        if (!image.isConnected) return;
        image.src = url;
        image.hidden = false;
        placeholder.hidden = true;
      }).catch(() => {});
      preview.addEventListener('click', () => void this.openPreview(attachment));
    } else {
      const icon = document.createElement('span');
      icon.className = 'o-form-attachment-file-icon';
      appendIcon(icon, isImage ? 'image' : 'file');
      preview.appendChild(icon);
      if (this.def.attachment_download_action) preview.addEventListener('click', () => void this.download(attachment));
      else preview.disabled = true;
    }
    const info = document.createElement('div');
    info.className = 'o-form-attachment-info';
    const name = document.createElement('strong');
    name.textContent = String(attachment.file_name || attachment.name || 'Attachment');
    name.title = name.textContent;
    const size = document.createElement('small');
    size.textContent = formatSize(attachment.size_bytes) || mime;
    info.append(name, size);
    item.append(preview, info);
    if (this.def.attachment_download_action) {
      const download = document.createElement('button');
      download.type = 'button';
      download.className = 'o-form-attachment-download';
      download.title = String(this.def.download_label || 'Download');
      download.setAttribute('aria-label', `${download.title}: ${name.textContent}`);
      appendIcon(download, 'download');
      download.addEventListener('click', () => void this.download(attachment));
      item.appendChild(download);
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
    const overlay = document.createElement('div');
    overlay.className = 'o-form-attachment-preview-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', String(attachment.file_name || this.def.preview_label || 'Attachment preview'));
    overlay.tabIndex = -1;
    const dialog = document.createElement('div');
    dialog.className = 'o-form-attachment-preview-dialog';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'o-form-attachment-preview-close';
    close.title = String(this.def.close_label || 'Close');
    close.setAttribute('aria-label', close.title);
    appendIcon(close, 'x');
    const image = document.createElement('img');
    image.src = url;
    image.alt = String(attachment.file_name || 'Image attachment');
    const footer = document.createElement('div');
    footer.className = 'o-form-attachment-preview-footer';
    const name = document.createElement('strong');
    name.textContent = String(attachment.file_name || 'Attachment');
    footer.appendChild(name);
    if (this.def.attachment_download_action) {
      const download = document.createElement('button');
      download.type = 'button';
      download.className = 'o-form-chatter-menu-confirm';
      download.textContent = String(this.def.download_label || 'Download');
      download.addEventListener('click', () => void this.download(attachment));
      footer.appendChild(download);
    }
    dialog.append(close, image, footer);
    overlay.appendChild(dialog);
    close.addEventListener('click', () => this.closePreview());
    overlay.addEventListener('click', event => { if (event.target === overlay) this.closePreview(); });
    this.previewKeyHandler = event => { if (event.key === 'Escape') this.closePreview(); };
    document.addEventListener('keydown', this.previewKeyHandler);
    document.body.appendChild(overlay);
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
