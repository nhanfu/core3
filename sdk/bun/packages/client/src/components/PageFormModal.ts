import { evalExpr } from '@core3/client/expr';
import { appendIcon } from '@core3/client/components/Icon';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { showToast, toastTypeForError } from '@core3/client/components/Toast';
import { i18n } from '@core3/client/i18n';
import { html } from '@core3/client/html';
import { ConventionComponentLoader } from '@core3/client/components/ConventionComponentLoader';

export class PageFormModal extends BaseComponent {
  private readonly componentLoader = new ConventionComponentLoader();
  readonly openFormModal: any;

  constructor(deps: any) {
    super('page-form-modal');
    this.openFormModal = this.createRenderer(deps);
  }

  private createRenderer(deps: any) {
    const { dataMap, ctx, client, refreshSources, resolveActionParams } = deps;
    const owner = this;

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

          const conventionPart = String(fieldDef.type || 'native').split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
          const requestedFieldType = `Page${conventionPart}Field`;
          const fieldType = (() => {
            try {
              owner.componentLoader.resolveSync(requestedFieldType);
              return requestedFieldType;
            } catch {
              return 'PageNativeField';
            }
          })();
          const fieldComponent = owner.componentLoader.createSync(fieldType, fieldId, {
            field: fieldDef,
            fieldId,
            initialValue,
            dataMap,
          });
          owner.mountChild(fieldComponent, group);
          const el = fieldComponent.element!;
          const usesAsyncSelect = fieldComponent.usesAsyncSelect;

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
          owner.disposeChildren();
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
