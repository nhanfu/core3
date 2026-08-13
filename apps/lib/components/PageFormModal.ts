import { evalExpr } from '@core3/client/expr';
import { appendIcon } from './Icon.ts';
import { AsyncSelect } from './AsyncSelect.ts';
import { MoneyInput } from './MoneyInput.ts';
import { BaseComponent } from './BaseComponent.ts';
import { showMessageDialog } from './Dialog.ts';

export class PageFormModal extends BaseComponent {
  readonly openFormModal: any;

  constructor(deps: any) {
    super('page-form-modal');
    this.openFormModal = this.createRenderer(deps);
  }

  private createRenderer(deps: any) {
    const { dataMap, ctx, client, refreshSources, resolveActionParams } = deps;

    async function openFormModal(actionDef: any, row: any) {
      return new Promise<void>(resolve => {
        const sourceRecord = actionDef.prefill === 'source'
          ? dataMap[actionDef.prefill_source || '']?.data
          : undefined;
        const formRecord = row || sourceRecord || {};
        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'core3-form-overlay';
        overlay.setAttribute('aria-hidden', 'false');

        // Dialog
        const dialog = document.createElement('div');
        dialog.className = 'core3-form-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.tabIndex = -1;

        // Header
        const header = document.createElement('div');
        header.className = 'core3-form-header';

        const titleEl = document.createElement('h2');
        titleEl.className = 'core3-form-title';
        const titleId = `form-dialog-title-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        titleEl.id = titleId;
        dialog.setAttribute('aria-labelledby', titleId);
        titleEl.textContent = actionDef.title || '';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'core3-form-close';
        appendIcon(closeBtn, 'x');
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', 'Đóng');
        closeBtn.title = 'Đóng';

        header.appendChild(titleEl);
        header.appendChild(closeBtn);
        dialog.appendChild(header);

        // Fields
        const inputs: Record<string, { el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement; fieldDef: any }> = {}; // field -> { el, fieldDef }
        for (const fieldDef of (actionDef.fields || [])) {
          if (fieldDef.show_if && !Boolean(evalExpr(fieldDef.show_if, { ...ctx, row: row || {} }))) continue;
          const group = document.createElement('div');
          group.className = 'core3-form-field';

          const label = document.createElement('label');
          label.className = 'core3-form-label';
          label.textContent = fieldDef.label + (fieldDef.required ? ' *' : '');
          const fieldId = `form-field-${fieldDef.field}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          label.htmlFor = fieldId;
          group.appendChild(label);

          // Determine initial value before constructing either a native control
          // or a searchable lookup adapter.
          let initialValue = fieldDef.default ?? '';
          const prefillRecord = actionDef.prefill === 'source' ? sourceRecord : row;
          if ((actionDef.prefill === 'row' || actionDef.prefill === 'source') && prefillRecord) {
            initialValue = prefillRecord[fieldDef.field] ?? fieldDef.default ?? '';
          }
          if (fieldDef.type === 'date' && initialValue && typeof initialValue === 'string') {
            initialValue = initialValue.slice(0, 10);
          } else if (fieldDef.type === 'datetime' && initialValue && typeof initialValue === 'string') {
            initialValue = initialValue.replace('Z', '').slice(0, 16);
          }

          let el;
          let usesAsyncSelect = false;
          let usesMoneyInput = false;
          if (fieldDef.type === 'async-select' || fieldDef.type === 'multi-select') {
            const optionRows = fieldDef.options_source
              ? (Array.isArray(dataMap[fieldDef.options_source]?.data) ? dataMap[fieldDef.options_source].data : [])
              : [];
            const options = fieldDef.options_source
              ? optionRows.map((option: any) => ({ value: String(option.value ?? option.id ?? option.code ?? ''), label: String(option.label ?? option.name ?? option.value ?? option.id ?? option.code ?? '') }))
              : (fieldDef.options || []).map((option: any) => {
                if (option && typeof option === 'object') {
                  const value = option.value ?? option.id ?? option.code;
                  return { value: String(value ?? ''), label: String(option.label ?? option.name ?? value ?? '') };
                }
                return { value: String(option ?? ''), label: String(option ?? '') };
              });
            const lookup = new AsyncSelect(fieldId, { value: initialValue }, {
              options,
              multiple: fieldDef.type === 'multi-select' || fieldDef.multiple === true,
              placeholder: fieldDef.placeholder,
              search_placeholder: fieldDef.search_placeholder,
            });
            lookup.mount(group);
            el = lookup.input;
            usesAsyncSelect = true;
          } else if (fieldDef.type === 'money') {
            const money = new MoneyInput(fieldId, { value: initialValue }, {
              currency: fieldDef.currency,
              decimals: fieldDef.decimals,
              placeholder: fieldDef.placeholder,
            });
            money.mount(group);
            el = money.input;
            usesMoneyInput = true;
          } else if (fieldDef.type === 'select') {
            el = document.createElement('select');
            el.className = `form-select core3-form-control${fieldDef.multiple ? ' core3-form-control-multiple' : ''}`;
            if (fieldDef.multiple) {
              el.multiple = true;
            }

            if (!fieldDef.multiple) {
              const emptyOpt = document.createElement('option');
              emptyOpt.value = '';
              emptyOpt.textContent = 'Chọn…';
              el.appendChild(emptyOpt);
            }

            const optionRows = fieldDef.options_source
              ? (Array.isArray(dataMap[fieldDef.options_source]?.data) ? dataMap[fieldDef.options_source].data : [])
              : [];
            const options = fieldDef.options_source
              ? optionRows.map((option: any) => ({ value: option.value ?? option.id ?? option.code, label: option.label ?? option.name ?? option.value ?? option.id ?? option.code }))
              : (fieldDef.options || []).map((option: any) => {
                if (option && typeof option === 'object') {
                  const value = option.value ?? option.id ?? option.code;
                  return { value, label: option.label ?? option.name ?? value };
                }
                return { value: option, label: option };
              });
            for (const opt of options) {
              const optEl = document.createElement('option');
              optEl.value = String(opt.value ?? '');
              optEl.textContent = String(opt.label ?? opt.value ?? '');
              el.appendChild(optEl);
            }
          } else if (fieldDef.type === 'textarea' || fieldDef.type === 'richtext') {
            el = document.createElement('textarea');
            el.className = fieldDef.type === 'richtext'
              ? 'form-input template-richtext core3-form-control core3-form-richtext'
              : 'form-input core3-form-control core3-form-textarea';
          } else {
            el = document.createElement('input');
            el.type = fieldDef.type === 'datetime' ? 'datetime-local' : (fieldDef.type || 'text');
            el.className = 'form-input core3-form-control';
          }
          el.id = fieldId;

          if (fieldDef.type === 'select' && fieldDef.multiple) {
            const selected = new Set(Array.isArray(initialValue) ? initialValue.map(String) : String(initialValue || '').split(',').map(value => value.trim()).filter(Boolean));
            for (const option of Array.from((el as HTMLSelectElement).options)) option.selected = selected.has(option.value);
          } else if (!usesAsyncSelect) {
            el.value = String(initialValue ?? '');
          }

          if (!usesAsyncSelect && !usesMoneyInput) group.appendChild(el);
          if (fieldDef.type === 'richtext' && Array.isArray(fieldDef.tokens) && fieldDef.tokens.length) {
            const tokenBar = document.createElement('div');
            tokenBar.className = 'template-token-picker core3-form-token-bar';
            for (const token of fieldDef.tokens) {
              const tokenButton = document.createElement('button');
              tokenButton.type = 'button';
              tokenButton.className = 'template-token core3-form-token';
              tokenButton.textContent = `{{${token}}}`;
              tokenButton.addEventListener('click', () => {
                const start = el.selectionStart ?? el.value.length;
                const end = el.selectionEnd ?? start;
                const insertion = `{{${token}}}`;
                el.value = `${el.value.slice(0, start)}${insertion}${el.value.slice(end)}`;
                el.selectionStart = el.selectionEnd = start + insertion.length;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.focus();
              });
              tokenBar.appendChild(tokenButton);
            }
            group.appendChild(tokenBar);
          }
          dialog.appendChild(group);
          inputs[fieldDef.field] = { el, fieldDef };
        }

        // Footer
        const footer = document.createElement('div');
        footer.className = 'core3-form-footer';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Hủy';

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'btn btn-primary';
        saveBtn.textContent = 'Lưu';

        footer.appendChild(cancelBtn);
        footer.appendChild(saveBtn);
        dialog.appendChild(footer);

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Error banner (created lazily)
        let errorBanner: HTMLElement | null = null;
        let closed = false;

        function showError(msg: string) {
          if (!errorBanner) {
            errorBanner = document.createElement('div');
            errorBanner.className = 'core3-form-error';
            footer.insertAdjacentElement('beforebegin', errorBanner);
          }
          errorBanner.textContent = msg;
          errorBanner.style.display = '';
        }

        function closeModal() {
          if (closed) return;
          closed = true;
          document.removeEventListener('keydown', onKeyDown);
          if (document.body.contains(overlay)) document.body.removeChild(overlay);
          resolve();
        }

        function onKeyDown(event: KeyboardEvent) {
          if (event.key === 'Escape') closeModal();
        }

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
        document.addEventListener('keydown', onKeyDown);
        (Object.values(inputs)[0]?.el || dialog).focus();

        saveBtn.addEventListener('click', async () => {
          // Reset error
          if (errorBanner) errorBanner.style.display = 'none';

          // Validate required fields
          let firstInvalid: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null = null;
          for (const { el, fieldDef } of Object.values(inputs)) {
            const v = fieldDef.type === 'multi-select'
              ? el.value.split(',').map(value => value.trim()).filter(Boolean)
              : el instanceof HTMLSelectElement && el.multiple
                ? Array.from(el.selectedOptions).map(option => option.value)
                : el.value?.trim() ?? '';
            if (fieldDef.required && (Array.isArray(v) ? v.length === 0 : !v)) {
              el.style.borderColor = '#ef4444';
              if (!firstInvalid) firstInvalid = el;
            } else {
              el.style.borderColor = '';
            }
          }
          if (firstInvalid) {
            firstInvalid.focus();
            return;
          }

          const changes = Object.entries(inputs).map(([field, { el }]) => ({
            field,
            value: inputs[field].fieldDef.type === 'multi-select'
              ? el.value.split(',').map(value => value.trim()).filter(Boolean)
              : el instanceof HTMLSelectElement && el.multiple
                ? Array.from(el.selectedOptions).map(option => option.value)
                : el.value,
          }));

          saveBtn.disabled = true;
          saveBtn.textContent = 'Đang lưu…';
          try {
            if (actionDef.type === 'server_form') {
              const actionContext = { ...ctx, row: row || {} };
              await client.action(actionDef.action, {
                ...resolveActionParams(actionDef.params, actionContext),
                id: formRecord.id ?? null,
                values: Object.fromEntries(changes.map(change => [change.field, change.value])),
              });
            } else {
              await client.patch({
                table: actionDef.table,
                action: actionDef.operation,
                id: formRecord.id ?? null,
                scope: actionDef.scope,
                changes,
              });
            }
            if (actionDef.success_message) await showMessageDialog({ title: 'Success', message: actionDef.success_message, confirmLabel: 'OK' });
            closeModal();
            if (actionDef.refresh?.length) await refreshSources(actionDef.refresh);
          } catch (err: any) {
            console.error('[page-renderer] patch error:', err);
            showError(err.message || 'Lưu thất bại. Vui lòng thử lại.');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Lưu';
          }
        });
      });
    }

    return openFormModal;
  }
}
