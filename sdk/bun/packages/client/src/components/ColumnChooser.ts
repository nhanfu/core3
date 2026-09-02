import { appendIcon } from '@core3/client/components/Icon';
import { html } from '@core3/client/html';

export type ColumnChooserColumn = { id?: string; field: string; label: string };
export type ColumnChooserOptions = {
  columns: ColumnChooserColumn[];
  visibleColumns: Iterable<string>;
  floating?: boolean;
  menuFixed?: boolean;
  labels?: { button?: string; title?: string; show?: (label: string) => string };
  onChange: (visibleColumns: string[]) => void;
};

export function drawColumnChooser(container: HTMLElement, options: ColumnChooserOptions): HTMLDetailsElement {
  const labels = { button: 'Columns', title: 'Columns', show: (label: string) => `Show ${label}`, ...options.labels };
  const visible = new Set([...options.visibleColumns].map(String));
  const details = html.take(container).details.className(`o-list-dropdown o-list-cog-menu${options.floating ? ' absolute right-2 top-2 z-30' : ' relative'}`).ele() as HTMLDetailsElement;
  if (options.floating) html.take(details).css('position', 'absolute').css('top', '8px').css('right', '8px').css('zIndex', '30');
  const summary = html.take(details).summary.attr('aria-label', labels.button).attr('title', labels.button).ele();
  appendIcon(summary, 'settings');
  const menu = html.take(details).div.className('o-list-dropdown-menu absolute right-0 z-10 min-w-[220px] rounded-md border border-gray-200 bg-white p-2 shadow-lg').ele();
  html.take(menu).css('backgroundColor', '#fff');
  html.take(menu).css('maxHeight', 'min(70vh, 420px)').css('overflowY', 'auto');
  let outsideClickHandler: ((event: MouseEvent) => void) | undefined;
  if (options.menuFixed || options.floating) {
    html.take(menu).css('position', 'fixed').css('zIndex', '1000').css('maxHeight', 'min(70vh, 420px)').css('overflowY', 'auto');
  }
  html.take(details).event('toggle', () => {
    if (!details.open) {
      if (outsideClickHandler) document.removeEventListener('click', outsideClickHandler, true);
      outsideClickHandler = undefined;
      return;
    }
    if (options.menuFixed || options.floating) {
      const bounds = summary.getBoundingClientRect();
      const menuHeight = menu.offsetHeight;
      const spaceBelow = window.innerHeight - bounds.bottom - 8;
      const spaceAbove = bounds.top - 8;
      const top = spaceBelow >= menuHeight || spaceBelow >= spaceAbove
        ? Math.min(bounds.bottom + 4, window.innerHeight - menuHeight - 8)
        : bounds.top - menuHeight - 4;
      menu.style.top = `${Math.round(Math.max(8, top))}px`;
      menu.style.left = `${Math.round(Math.max(12, bounds.right - menu.offsetWidth))}px`;
      menu.style.right = 'auto';
    }
    outsideClickHandler = event => {
      if (details.contains(event.target as Node)) return;
      details.open = false;
    };
    document.addEventListener('click', outsideClickHandler, true);
  });
  html.take(menu).h4.className('mb-2 px-2 text-sm font-semibold text-gray-900').text(labels.title);
  for (const column of options.columns) {
    const id = String(column.id || column.field);
    const label = html.take(menu).label.className('token-label flex items-center gap-2 px-2 py-1 text-sm text-gray-700').ele();
    const checkbox = html.take(label).input.attr('type', 'checkbox').prop('checked', visible.has(id)).attr('aria-label', labels.show(column.label)).ele() as HTMLInputElement;
    html.take(checkbox).event('change', () => {
      const next = new Set(visible);
      if (checkbox.checked) next.add(id);
      else if (next.size > 1) next.delete(id);
      else { checkbox.checked = true; return; }
      options.onChange([...next]);
    });
    html.take(label).text(column.label);
  }
  return details;
}
