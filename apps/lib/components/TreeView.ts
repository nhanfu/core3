import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export class TreeView extends BaseComponent {
  constructor(id, state) {
    super(id, state);
  }

  renderNode(ul, node, level) {
    const { expanded = new Set() } = this.state;
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isExpanded  = expanded.has(node.id);
    const paddingLeft = `${level * 16 + 8}px`;

    const li  = html.take(ul).li.className('select-none').getContext();
    const row = html.take(li)
      .div.className('flex items-center gap-1.5 py-1.5 px-2 rounded-md hover:bg-gray-100 cursor-pointer text-sm text-gray-800 transition-colors')
      .style(`padding-left: ${paddingLeft}`)
      .getContext();

    if (hasChildren) {
      html.take(row).span.className('text-gray-400 text-xs w-3 text-center flex-shrink-0').text(isExpanded ? '▼' : '▶');
    } else {
      html.take(row).span.className('w-3 flex-shrink-0');
    }

    if (node.icon) {
      html.take(row).span.className('flex-shrink-0').text(node.icon);
    }

    html.take(row).span.text(node.label || '');

    if (hasChildren) {
      row.addEventListener('click', () => {
        const next = new Set(this.state.expanded || []);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        this.setState({ expanded: next });
      });

      if (isExpanded) {
        const childUl = html.take(li).ul.getContext();
        for (const child of node.children) {
          this.renderNode(childUl, child, level + 1);
        }
      }
    } else {
      row.addEventListener('click', () => this.submit('node.select', { id: node.id }));
    }
  }

  draw(container) {
    const { nodes = [] } = this.state;
    const root = html.take(container).ul.className('py-1').getContext();
    for (const node of nodes) {
      this.renderNode(root, node, 0);
    }
  }
}
