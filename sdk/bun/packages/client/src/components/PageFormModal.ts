import { evalExpr } from '@core3/client/expr';
import { appendIcon } from '@core3/client/components/Icon';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { showToast, toastTypeForError } from '@core3/client/components/Toast';
import { i18n } from '@core3/client/i18n';
import { html } from '@core3/client/html';
import { ComLoader } from '@core3/client/components/ComLoader';

function safeMailPreview(value: unknown) {
  const template = document.createElement('template');
  template.innerHTML = String(value ?? '');
  const allowed = new Set(['A', 'BR', 'DIV', 'EM', 'H2', 'HR', 'LI', 'P', 'SPAN', 'STRONG', 'UL']);
  for (const element of Array.from(template.content.querySelectorAll('*'))) {
    if (!allowed.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name.toLowerCase().startsWith('on') || (element.tagName !== 'A' && attribute.name !== 'class')) {
        element.removeAttribute(attribute.name);
      }
    }
    if (element.tagName === 'A') {
      const href = element.getAttribute('href') || '';
      if (!/^https?:\/\//i.test(href)) element.removeAttribute('href');
      element.setAttribute('rel', 'noreferrer');
      element.setAttribute('target', '_blank');
    }
  }
  return template.innerHTML;
}

export class PageFormModal extends BaseComponent {
  private readonly componentLoader = new ComLoader();
  readonly openFormModal: any;

  constructor(deps: any) {
    super('page-form-modal');
    this.openFormModal = this.createRenderer(deps);
  }

  private createRenderer(deps: any) {
    const { dataMap, ctx, client, refreshSources, resolveActionParams } = deps;
    const componentLoader = this.componentLoader;
    const mountChild = this.mountChild.bind(this);
    const disposeChildren = this.disposeChildren.bind(this);

    async function openFormModal(actionDef: any, row: any) {
      return new Promise<void>(resolve => {
        const isMailComposer = actionDef.modal_style === 'mail_composer';
        const sourceRecord = actionDef.prefill === 'source'
          ? dataMap[actionDef.prefill_source || '']?.data
          : undefined;
        const actionContext = { ...ctx, row: row || {} };
        const mappedPrefill = actionDef.prefill && typeof actionDef.prefill === 'object' && !Array.isArray(actionDef.prefill)
          ? resolveActionParams(actionDef.prefill, actionContext)
          : {};
        const formRecord = {
          ...(row || sourceRecord || {}),
          ...Object.fromEntries(Object.entries(mappedPrefill).filter(([, value]) => value !== undefined && value !== null && value !== '')),
        };
        // Overlay
        const overlay = html.take(document.body).div.className('form-overlay').attr('aria-hidden', 'false').ele() as HTMLDivElement;

        // Dialog
        const dialog = html.take(overlay).div.className(`form-dialog${isMailComposer ? ' mail-composer-dialog' : ''}`).attr('role', 'dialog').attr('aria-modal', 'true').prop('tabIndex', -1).ele() as HTMLDivElement;

        // Header
        const header = html.take(dialog).div.className('form-header').ele() as HTMLDivElement;

        const titleEl = html.take(header).h2.className('form-title').ele() as HTMLHeadingElement;
        const titleId = `form-dialog-title-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        html.take(titleEl).prop('id', titleId);
        html.take(dialog).attr('aria-labelledby', titleId);
        html.take(titleEl).replaceText(actionDef.title || '');

        const closeBtn = html.take(header).button.className('form-close').ele() as HTMLButtonElement;
        appendIcon(closeBtn, 'x');
        html.take(closeBtn).type('button');
        html.take(closeBtn).attr('aria-label', i18n.tKey('labels.close', {}, 'Close'));
        html.take(closeBtn).prop('title', i18n.tKey('labels.close', {}, 'Close'));


        // Fields
        type InputEntry = { el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement; fieldDef: any; group: HTMLDivElement };
        const inputs: Record<string, InputEntry> = {}; // field -> { el, fieldDef, group }
        const setFieldError = (entry: InputEntry, message: string) => {
          html.take(entry.el).css('borderColor', '#ef4444').attr('aria-invalid', 'true');
          let error = entry.group.querySelector<HTMLElement>('.form-field-error');
          if (!error) {
            error = html.take(entry.group).div.className('form-error form-field-error').attr('role', 'alert').ele() as HTMLElement;
          }
          html.take(error).replaceText(message);
        };
        const clearFieldError = (entry: InputEntry) => {
          html.take(entry.el).css('borderColor', '');
          entry.el.removeAttribute('aria-invalid');
          entry.group.querySelector('.form-field-error')?.remove();
        };
        const fieldTarget = isMailComposer
          ? html.take(dialog).div.className('mail-composer-body').ele() as HTMLDivElement
          : dialog;
        for (const fieldDef of (actionDef.fields || [])) {
          if (fieldDef.show_if && !evalExpr(fieldDef.show_if, { ...ctx, row: row || {} })) continue;
          const rawFieldType = String(fieldDef.type || 'text');
          const initialValue = (() => {
            let value: any = fieldDef.default ?? '';
            const prefillRecord = actionDef.prefill === 'source' ? sourceRecord : row;
            if ((actionDef.prefill === 'row' || actionDef.prefill === 'source' || Object.keys(mappedPrefill).length) && prefillRecord) {
              value = formRecord[fieldDef.field] ?? fieldDef.default ?? '';
            }
            return value;
          })();
          if (rawFieldType === 'hidden') {
            const hidden = html.take(fieldTarget).input.type('hidden').prop('value', String(initialValue ?? '')).ele() as HTMLInputElement;
            inputs[fieldDef.field] = { el: hidden, fieldDef, group: fieldTarget };
            continue;
          }
          const group = html.take(fieldTarget).div.className('form-field').ele() as HTMLDivElement;

          if (isMailComposer && rawFieldType === 'mail_recipient') {
            html.take(group).className('form-field mail-composer-field mail-composer-recipient');
            html.take(group).label.className('form-label').replaceText(String(fieldDef.label || 'To'));
            const value = html.take(group).div.className('mail-composer-recipient-value').ele() as HTMLDivElement;
            html.take(value).span.className('mail-recipient-chip').replaceText(String(initialValue || '—'));
            const hidden = html.take(value).input.type('hidden').prop('value', String(initialValue ?? '')).ele() as HTMLInputElement;
            inputs[fieldDef.field] = { el: hidden, fieldDef, group };
            continue;
          }

          if (isMailComposer && rawFieldType === 'mail_attachment') {
            html.take(group).className('form-field mail-composer-field mail-composer-attachment');
            const attachment = html.take(group).div.className('mail-attachment-chip').ele() as HTMLDivElement;
            html.take(attachment).span.className('mail-attachment-icon').replaceText('PDF');
            html.take(attachment).span.className('mail-attachment-name').replaceText(String(initialValue || 'Attachment'));
            const hidden = html.take(group).input.type('hidden').prop('value', String(initialValue ?? '')).ele() as HTMLInputElement;
            inputs[fieldDef.field] = { el: hidden, fieldDef, group };
            continue;
          }

          if (isMailComposer && rawFieldType === 'mail_body') {
            html.take(group).className('form-field mail-composer-field mail-composer-body-field');
            html.take(group).label.className('form-label').replaceText(String(fieldDef.label || 'Message'));
            const preview = html.take(group).div.className('mail-composer-preview').attr('contenteditable', 'true').attr('role', 'textbox').attr('aria-label', String(fieldDef.label || 'Message')).ele() as HTMLDivElement;
            preview.innerHTML = safeMailPreview(initialValue);
            const hidden = html.take(group).textarea.className('sr-only').prop('value', String(initialValue ?? '')).ele() as HTMLTextAreaElement;
            inputs[fieldDef.field] = { el: hidden, fieldDef, group };
            html.take(preview).event('input', () => {
              hidden.value = safeMailPreview(preview.innerHTML);
              clearFieldError(inputs[fieldDef.field]);
            });
            continue;
          }

          const label = html.take(group).label.className('form-label').replaceText(fieldDef.label + (fieldDef.required ? ' *' : '')).ele() as HTMLLabelElement;
          const fieldId = `form-field-${fieldDef.field}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          label.htmlFor = fieldId;

          // Determine initial value before constructing either a native control
          // or a searchable lookup adapter.
          let fieldInitialValue = initialValue;
          const prefillRecord = actionDef.prefill === 'source' ? sourceRecord : row;
          if ((actionDef.prefill === 'row' || actionDef.prefill === 'source' || Object.keys(mappedPrefill).length) && prefillRecord) {
            fieldInitialValue = formRecord[fieldDef.field] ?? fieldDef.default ?? '';
          }
          if (fieldDef.type === 'date' && fieldInitialValue && typeof fieldInitialValue === 'string') {
            fieldInitialValue = fieldInitialValue.slice(0, 10);
          } else if (fieldDef.type === 'datetime' && fieldInitialValue && typeof fieldInitialValue === 'string') {
            fieldInitialValue = fieldInitialValue.replace('Z', '').slice(0, 16);
          }

          const conventionPart = String(fieldDef.type || 'native').split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
          const requestedFieldType = `Page${conventionPart}Field`;
          const fieldComponentType = (() => {
            try {
              componentLoader.resolveSync(requestedFieldType);
              return requestedFieldType;
            } catch {
              return 'PageNativeField';
            }
          })();
          const fieldComponent = componentLoader.createSync(fieldComponentType, fieldId, {
            field: fieldDef,
            fieldId,
            initialValue: fieldInitialValue,
            dataMap,
          });
          mountChild(fieldComponent, group);
          const el = fieldComponent.element!;

          if (fieldDef.type === 'richtext' && Array.isArray(fieldDef.tokens) && fieldDef.tokens.length) {
            const textEditor = el as HTMLInputElement | HTMLTextAreaElement;
            const tokenBar = html.take(group).div.className('template-token-picker form-token-bar').ele() as HTMLDivElement;
            for (const token of fieldDef.tokens) {
              const tokenButton = html.take(tokenBar).button.ele() as HTMLButtonElement;
              html.take(tokenButton).type('button');
              html.take(tokenButton).className('template-token form-token').replaceText(`{{${token}}}`).event('click', () => {
                const start = textEditor.selectionStart ?? textEditor.value.length;
                const end = textEditor.selectionEnd ?? start;
                const insertion = `{{${token}}}`;
                html.take(textEditor).prop('value', `${textEditor.value.slice(0, start)}${insertion}${textEditor.value.slice(end)}`);
                textEditor.selectionStart = textEditor.selectionEnd = start + insertion.length;
                html.take(textEditor).dispatch(new Event('input', { bubbles: true })).focus();
              });
            }
          }
          inputs[fieldDef.field] = { el, fieldDef, group };
          html.take(el).event('input', () => clearFieldError(inputs[fieldDef.field])).event('change', () => clearFieldError(inputs[fieldDef.field]));
        }

        // Footer
        const footer = html.take(dialog).div.className('form-footer').ele() as HTMLDivElement;

        const cancelBtn = html.take(footer).button.ele() as HTMLButtonElement;
        html.take(cancelBtn).type('button');
        html.take(cancelBtn).className('btn btn-secondary').replaceText(i18n.tKey('labels.cancel', {}, 'Cancel'));

        const saveBtn = html.take(footer).button.ele() as HTMLButtonElement;
        html.take(saveBtn).type('button');
        html.take(saveBtn).className('btn btn-primary').replaceText(i18n.tKey('labels.save', {}, 'Save'));
        if (isMailComposer) {
          html.take(cancelBtn).replaceText(String(actionDef.cancel_label || 'Discard'));
          html.take(saveBtn).replaceText(String(actionDef.submit_label || 'Send'));
          const toolBar = html.take(footer).div.className('mail-composer-footer-tools').ele() as HTMLDivElement;
          for (const tool of [{ label: 'Attach files', icon: '⌕' }, { label: 'More', icon: '⋮' }, { label: 'Schedule send', icon: '◷' }]) {
            const button = html.take(toolBar).button.type('button').className('mail-composer-footer-tool').attr('aria-label', tool.label).prop('title', tool.label).replaceText(tool.icon).ele() as HTMLButtonElement;
            html.take(button).event('click', () => showToast(`${tool.label} is not available for this deterministic event fixture.`, 'info'));
          }
        }


        // Error banner (created lazily)
        let closed = false;

        function closeModal() {
          if (closed) return;
          closed = true;
                disposeChildren();
          html.take(document).off('keydown', onKeyDown);
          if (document.body.contains(overlay)) html.take(overlay).remove();
          resolve();
        }

        function onKeyDown(event: KeyboardEvent) {
          if (event.key === 'Escape') closeModal();
        }

        html.take(closeBtn).event('click', closeModal);
        html.take(cancelBtn).event('click', closeModal);
        html.take(overlay).event('click', e => { if (e.target === overlay) closeModal(); });
        html.take(document).event('keydown', onKeyDown);
        html.take(Object.values(inputs)[0]?.el || dialog).focus();

        html.take(saveBtn).event('click', async () => {
          // Reset error
          // Validate required fields
          let firstInvalid: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null = null;
          const readFieldValue = (entry: InputEntry) => {
            const { el, fieldDef } = entry;
            if (el instanceof HTMLInputElement && el.type === 'checkbox') return el.checked;
            if (fieldDef.type === 'multi-select' || fieldDef.type === 'permission-grid') return el.value.split(',').map(value => value.trim()).filter(Boolean);
            if (el instanceof HTMLSelectElement && el.multiple) return Array.from(el.selectedOptions).map(option => option.value);
            return el.value?.trim() ?? '';
          };
          for (const entry of Object.values(inputs)) {
            const { el, fieldDef } = entry;
            const v = readFieldValue(entry);
            const label = String(fieldDef.label || fieldDef.field);
            if (fieldDef.required && (Array.isArray(v) ? v.length === 0 : !v)) {
              setFieldError(entry, `${label} is required.`);
              if (!firstInvalid) firstInvalid = el;
            } else if (['number', 'money'].includes(String(fieldDef.type)) && String(v).trim()) {
              const numeric = Number(String(v).replace(',', '.'));
              if (!Number.isFinite(numeric)) {
                setFieldError(entry, `${label} must be a valid number.`);
                if (!firstInvalid) firstInvalid = el;
              } else if (fieldDef.min !== undefined && numeric < Number(fieldDef.min)) {
                setFieldError(entry, `${label} must be at least ${fieldDef.min}.`);
                if (!firstInvalid) firstInvalid = el;
              } else if (fieldDef.max !== undefined && numeric > Number(fieldDef.max)) {
                setFieldError(entry, `${label} must be at most ${fieldDef.max}.`);
                if (!firstInvalid) firstInvalid = el;
              } else {
                clearFieldError(entry);
              }
            } else {
              clearFieldError(entry);
            }
          }
          if (firstInvalid) {
            html.take(firstInvalid).focus();
            return;
          }

          const changes = Object.entries(inputs).map(([field, entry]) => ({
            field,
            value: readFieldValue(entry),
          }));

              html.take(saveBtn).prop('disabled', true).replaceText(i18n.tKey('labels.saving', {}, 'Saving…'));
          try {
            if (actionDef.type === 'server_form') {
              const actionContext = { ...ctx, row: row || {} };
              const actionParams = resolveActionParams(actionDef.params, actionContext);
              await client.action(actionDef.action, {
                ...actionParams,
                id: actionParams.id ?? formRecord.id ?? null,
                expected_row_version: formRecord.row_version,
                parent_expected_row_version: dataMap.order_detail?.data?.row_version,
                values: Object.fromEntries(changes.map(change => [change.field, change.value])),
              });
            } else {
              await client.patch({
                table: actionDef.table,
                action: actionDef.operation,
                id: formRecord.id ?? null,
                expected_row_version: formRecord.row_version,
                scope: actionDef.scope,
                changes,
              });
            }
            if (actionDef.success_message) showToast(actionDef.success_message, 'success');
            closeModal();
            if (actionDef.refresh?.length) await refreshSources(actionDef.refresh);
          } catch (err: any) {
            console.error('[page-renderer] patch error:', err);
            showToast(err.message || 'Lưu thất bại. Vui lòng thử lại.', toastTypeForError(err));
            html.take(saveBtn).prop('disabled', false).replaceText(i18n.tKey('labels.save', {}, 'Save'));
          }
        });
      });
    }

    return openFormModal;
  }
}
