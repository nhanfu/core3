import { evalExpr } from '@core3/client/expr';
import { appendIcon } from '@core3/client/components/Icon';
import { AsyncSelect } from '@core3/client/components/AsyncSelect';
import { MoneyInput } from '@core3/client/components/MoneyInput';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { showToast, toastTypeForError } from '@core3/client/components/Toast';
import { i18n } from '@core3/client/i18n';
import { html } from '@core3/client/html';

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
        const overlay = html.take(document.body).div.className('form-overlay').attr('aria-hidden', 'false').ele() as HTMLDivElement;

        // Dialog
        const dialog = html.take(overlay).div.className('form-dialog').attr('role', 'dialog').attr('aria-modal', 'true').prop('tabIndex', -1).ele() as HTMLDivElement;

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
        const inputs: Record<string, { el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement; fieldDef: any }> = {}; // field -> { el, fieldDef }
        for (const fieldDef of (actionDef.fields || [])) {
          if (fieldDef.show_if && !evalExpr(fieldDef.show_if, { ...ctx, row: row || {} })) continue;
          const group = html.take(dialog).div.className('form-field').ele() as HTMLDivElement;

          const label = html.take(group).label.className('form-label').replaceText(fieldDef.label + (fieldDef.required ? ' *' : '')).ele() as HTMLLabelElement;
          const fieldId = `form-field-${fieldDef.field}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          label.htmlFor = fieldId;

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
          if (fieldDef.type === 'permission-grid') {
            const optionRows = fieldDef.options_source
              ? (Array.isArray(dataMap[fieldDef.options_source]?.data) ? dataMap[fieldDef.options_source].data : [])
              : [];
            const selected = new Set(Array.isArray(initialValue)
              ? initialValue.map(String)
              : String(initialValue || '').split(',').map(value => value.trim()).filter(Boolean));
            const hidden = html.take(group).input.type('hidden').ele() as HTMLInputElement;
            html.take(hidden).prop('id', fieldId).prop('value', [...selected].join(','));
            const groups = new Map<string, HTMLDivElement>();
            for (const option of optionRows) {
              const key = String(option.value ?? option.permission_key ?? option.id ?? '');
              if (!key) continue;
              const groupKey = String(option.group || key.split('.')[0] || 'General');
              let grid = groups.get(groupKey);
              if (!grid) {
                const section = html.take(group).section.className('permission-grid-group').ele() as HTMLElement;
                html.take(section).h3.className('permission-grid-title').replaceText(groupKey);
                grid = html.take(section).div.className('permission-grid').ele() as HTMLDivElement;
                groups.set(groupKey, grid);
              }
              const row = html.take(grid).label.className('permission-grid-item').ele() as HTMLLabelElement;
              const checkbox = html.take(row).input.type('checkbox').ele() as HTMLInputElement;
              const checked = selected.has(key) || option.enabled === true;
              html.take(checkbox).prop('checked', checked).attr('aria-label', String(option.label || key));
              html.take(row).span.className('permission-grid-label').replaceText(String(option.label || key));
              html.take(checkbox).event('change', () => {
                if (checkbox.checked) selected.add(key);
                else selected.delete(key);
                hidden.value = [...selected].sort().join(',');
              });
            }
            el = hidden;
          } else if (fieldDef.type === 'async-select' || fieldDef.type === 'multi-select') {
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
          } else if (fieldDef.type === 'select') {
            el = html.take(group).select.ele() as HTMLSelectElement;
            html.take(el).className(`form-select form-control${fieldDef.multiple ? ' form-control-multiple' : ''}`);
            if (fieldDef.multiple) {
              html.take(el).prop('multiple', true);
            }

            if (!fieldDef.multiple) {
              html.take(el).option.prop('value', '').replaceText(i18n.tKey('labels.select', {}, 'Chọn…'));
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
              html.take(el).option.prop('value', String(opt.value ?? '')).replaceText(String(opt.label ?? opt.value ?? ''));
            }
          } else if (fieldDef.type === 'textarea' || fieldDef.type === 'richtext') {
            el = html.take(group).textarea.ele() as HTMLTextAreaElement;
            html.take(el).className(fieldDef.type === 'richtext'
              ? 'form-input template-richtext form-control form-richtext'
              : 'form-input form-control form-textarea');
          } else {
            el = html.take(group).input.ele() as HTMLInputElement;
            html.take(el).type(['date', 'time', 'datetime'].includes(fieldDef.type) ? 'text' : (fieldDef.type || 'text'));
            if (fieldDef.type === 'date' || fieldDef.type === 'time' || fieldDef.type === 'datetime') {
              html.take(el).prop('inputMode', 'numeric');
              html.take(el).prop('placeholder', fieldDef.type === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm');
            }
            html.take(el).className('form-input form-control');
          }
          html.take(el).prop('id', fieldId);

          if (fieldDef.type === 'select' && fieldDef.multiple) {
            const selected = new Set(Array.isArray(initialValue) ? initialValue.map(String) : String(initialValue || '').split(',').map(value => value.trim()).filter(Boolean));
            for (const option of Array.from((el as HTMLSelectElement).options)) html.take(option).prop('selected', selected.has(option.value));
          } else if (!usesAsyncSelect) {
            html.take(el).prop('value', String(initialValue ?? ''));
          }

          if (fieldDef.type === 'richtext' && Array.isArray(fieldDef.tokens) && fieldDef.tokens.length) {
            const tokenBar = html.take(group).div.className('template-token-picker form-token-bar').ele() as HTMLDivElement;
            for (const token of fieldDef.tokens) {
              const tokenButton = html.take(tokenBar).button.ele() as HTMLButtonElement;
              html.take(tokenButton).type('button');
              html.take(tokenButton).className('template-token form-token').replaceText(`{{${token}}}`).event('click', () => {
                const start = el.selectionStart ?? el.value.length;
                const end = el.selectionEnd ?? start;
                const insertion = `{{${token}}}`;
                html.take(el).prop('value', `${el.value.slice(0, start)}${insertion}${el.value.slice(end)}`);
                el.selectionStart = el.selectionEnd = start + insertion.length;
                html.take(el).dispatch(new Event('input', { bubbles: true })).focus();
              });
            }
          }
          inputs[fieldDef.field] = { el, fieldDef };
        }

        // Footer
        const footer = html.take(dialog).div.className('form-footer').ele() as HTMLDivElement;

        const cancelBtn = html.take(footer).button.ele() as HTMLButtonElement;
        html.take(cancelBtn).type('button');
        html.take(cancelBtn).className('btn btn-secondary').replaceText(i18n.tKey('labels.cancel', {}, 'Cancel'));

        const saveBtn = html.take(footer).button.ele() as HTMLButtonElement;
        html.take(saveBtn).type('button');
        html.take(saveBtn).className('btn btn-primary').replaceText(i18n.tKey('labels.save', {}, 'Save'));


        // Error banner (created lazily)
        let closed = false;

        function closeModal() {
          if (closed) return;
          closed = true;
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
          for (const { el, fieldDef } of Object.values(inputs)) {
            const v = fieldDef.type === 'multi-select' || fieldDef.type === 'permission-grid'
              ? el.value.split(',').map(value => value.trim()).filter(Boolean)
              : el instanceof HTMLSelectElement && el.multiple
                ? Array.from(el.selectedOptions).map(option => option.value)
                : el.value?.trim() ?? '';
            if (fieldDef.required && (Array.isArray(v) ? v.length === 0 : !v)) {
              html.take(el).css('borderColor', '#ef4444');
              if (!firstInvalid) firstInvalid = el;
            } else {
              html.take(el).css('borderColor', '');
            }
          }
          if (firstInvalid) {
            html.take(firstInvalid).focus();
            return;
          }

          const changes = Object.entries(inputs).map(([field, { el }]) => ({
            field,
            value: inputs[field].fieldDef.type === 'multi-select' || inputs[field].fieldDef.type === 'permission-grid'
              ? el.value.split(',').map(value => value.trim()).filter(Boolean)
              : el instanceof HTMLSelectElement && el.multiple
                ? Array.from(el.selectedOptions).map(option => option.value)
                : el.value,
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
