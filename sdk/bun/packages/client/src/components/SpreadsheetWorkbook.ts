import { BaseComponent } from './BaseComponent';
import { SpreadsheetAdapter } from '../adapters/SpreadsheetAdapter';
import { exportWorkbookXlsx } from '../spreadsheet/engine';

/** Engine surface; permissions, data sources, and persistence actions belong to page YAML. */
export class SpreadsheetWorkbook extends BaseComponent {
  model: any = null;
  static resolveState(definition: any, context: any) {
    const source = context.dataMap?.[definition.source]?.data;
    return { ...definition, workbook: Array.isArray(source) ? source[0] : source };
  }

  draw(container: HTMLElement) {
    const workbook = this.state.workbook;
    const section = document.createElement('section');
    section.setAttribute('aria-label', this.state.title || 'Spreadsheet');
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = 'Loading spreadsheet…';
    section.append(status);
    container.append(section);
    if (!workbook) { status.textContent = 'Workbook unavailable.'; return; }
    const controls = document.createElement('div');
    const canvas = document.createElement('div');
    canvas.style.cssText = 'height:75vh;min-height:420px;position:relative;overflow:hidden';
    section.append(controls, canvas);
    this.mountAdapter('workbook', new SpreadsheetAdapter(), canvas, {
      data: workbook.workbook_snapshot,
      mode: this.state.mode || 'readonly',
      config: this.state.engine_config,
      revisions: this.state.revisions,
      onError: error => { status.textContent = error.message; },
      onReady: model => {
        this.model = model;
        this.state.on_model_ready?.(model);
        status.textContent = this.state.mode === 'normal' ? 'Ready' : 'View only';
        if (this.state.mode === 'normal' && this.state.save_action) {
          const save = document.createElement('button');
          save.type = 'button';
          save.textContent = 'Save';
          save.addEventListener('click', async () => {
            save.disabled = true;
            status.textContent = 'Saving…';
            try {
              const result: any = await this.submit(this.state.save_action, {
                row: workbook,
                values: { workbook_snapshot: JSON.stringify(model.exportData()) },
              });
              if (result?.row_version !== undefined) workbook.row_version = result.row_version;
              status.textContent = 'Saved';
            } catch (error) { status.textContent = error instanceof Error ? error.message : 'Save failed'; }
            finally { save.disabled = false; }
          });
          controls.append(save);
        }
        if (this.state.allow_export) {
          const download = document.createElement('button');
          download.type = 'button';
          download.textContent = 'Download XLSX';
          download.addEventListener('click', async () => {
            download.disabled = true;
            let url: string | undefined;
            try {
              const bytes = this.state.export_file ? await this.state.export_file() : await exportWorkbookXlsx(model);
              url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
              const link = document.createElement('a');
              link.href = url;
              link.download = `${String(workbook.name || 'workbook').replace(/[^\p{L}\p{N}_-]/gu, '_')}.xlsx`;
              link.click();
            } catch (error) { status.textContent = error instanceof Error ? error.message : 'Export failed'; }
            finally {
              if (url) setTimeout(() => URL.revokeObjectURL(url!), 1000);
              download.disabled = false;
            }
          });
          controls.append(download);
        }
      },
    });
  }
}
