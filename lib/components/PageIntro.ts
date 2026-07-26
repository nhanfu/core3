import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

export class PageIntro extends BaseComponent {
  draw(container: HTMLElement) {
    const greeting = String(this.state.greeting || 'Xin chào');
    const user = (globalThis as any).__CORE3_USER__;
    const name = String(user?.name || '');
    const root = html.take(container).div.className('page-intro flex items-center justify-between gap-3').getContext();
    const copy = html.take(root).div.getContext();
    html.take(copy).p.className('text-sm text-slate-500').text(name ? `${greeting}, ${name}` : greeting);
    if (this.state.title) html.take(copy).h2.className('mt-1 text-lg font-semibold text-slate-900').text(String(this.state.title));
    if (this.state.description) html.take(copy).p.className('mt-1 text-sm text-slate-500').text(String(this.state.description));
    if (this.state.action_label) {
      html.take(root).span.className('text-xl text-amber-500').text('◌');
    }
  }
}
