import { ExternalWidgetAdapter } from './ExternalWidgetAdapter';
import { loadSpreadsheetEngine, readWorkbook, type WorkbookMode } from '../spreadsheet/engine';

export type SpreadsheetOptions = {
  data: unknown;
  mode: WorkbookMode;
  config?: Record<string, unknown>;
  revisions?: any[];
  onReady?: (model: any) => void;
  onError: (error: Error) => void;
};
type MountedSpreadsheet = { disposed: boolean; app?: any; model?: any };

export class SpreadsheetAdapter extends ExternalWidgetAdapter<SpreadsheetOptions, MountedSpreadsheet> {
  protected create(container: HTMLElement, options: SpreadsheetOptions) {
    const widget: MountedSpreadsheet = { disposed: false };
    void this.initialize(widget, container, options);
    return widget;
  }

  private async initialize(widget: MountedSpreadsheet, container: HTMLElement, options: SpreadsheetOptions) {
    try {
      const { App, Spreadsheet, Model, templates, styles } = await loadSpreadsheetEngine();
      if (widget.disposed) return;
      if (!('CSSScopeRule' in window)) throw new Error('This browser does not support the spreadsheet style boundary.');
      if (document.querySelector('.o-spreadsheet')) throw new Error('Only one spreadsheet can be displayed per page.');
      // The engine uses document.querySelector for viewport and overlay geometry,
      // so it needs light DOM. CSS scope contains Bootstrap without breaking input.
      container.classList.add('core3-spreadsheet-host');
      const style = document.createElement('style');
      const fonts = styles.match(/@font-face\s*\{[^}]*\}/g) || [];
      const scoped = styles.replace(/@font-face\s*\{[^}]*\}/g, '').replaceAll(':root', ':scope');
      style.textContent = fonts.join('\n') + '\n@scope (.core3-spreadsheet-host) {\n' + scoped + '\n.core3-engine-root { height:100%; }\n}';
      const root = document.createElement('div');
      root.className = 'core3-engine-root';
      container.replaceChildren(style, root);
      widget.model = new Model(readWorkbook(options.data), { ...options.config, mode: options.mode }, options.revisions || []);
      widget.app = new App(Spreadsheet, { props: { model: widget.model }, templates });
      await widget.app.mount(root);
      if (!widget.disposed) options.onReady?.(widget.model);
    } catch (error) {
      const report = !widget.disposed;
      this.destroy(widget);
      if (report) options.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  protected updateWidget(widget: MountedSpreadsheet, options: SpreadsheetOptions) {
    widget.model?.updateMode(options.mode);
  }

  protected destroy(widget: MountedSpreadsheet) {
    if (widget.disposed) return;
    widget.disposed = true;
    widget.app?.destroy();
    // Disposal must not serialize a million-cell workbook simply to leave a local session.
    if (widget.model) {
      widget.model.updateMode('readonly');
      void widget.model.leaveSession().catch(() => {});
    }
  }
}
