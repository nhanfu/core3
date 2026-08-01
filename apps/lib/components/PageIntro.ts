import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';
import { appendIcon } from './Icon.ts';

export class PageIntro extends BaseComponent {
  draw(container: HTMLElement) {
    const greeting = String(this.state.greeting || 'Xin chào');
    const user = (globalThis as any).__CORE3_USER__;
    const name = String(user?.name || '');
    const rightGreeting = this.state.greeting_side === 'right';
    const compact = Boolean(this.state.compact);
    const root = html.take(container).div
      .className(`page-intro flex items-center justify-between gap-3${compact ? ' page-intro-compact' : ''}`)
      .getContext();
    const copy = html.take(root).div.getContext();
    if (!rightGreeting) {
      html.take(copy).p.className('text-sm text-slate-500').text(name ? `${greeting}, ${name}` : greeting);
    }
    if (this.state.title) {
      html.take(copy).h2
        .className(rightGreeting ? 'text-lg font-semibold text-slate-900' : 'mt-1 text-lg font-semibold text-slate-900')
        .text(String(this.state.title));
    }
    if (this.state.description) html.take(copy).p.className('mt-1 text-sm text-slate-500').text(String(this.state.description));
    if (rightGreeting) {
      html.take(root).p.className('page-intro-greeting text-sm text-slate-500').text(name ? `${greeting}, ${name}` : greeting);
    }
    if (this.state.action_label) {
      const action = document.createElement('span');
      action.className = 'page-intro-action text-amber-500';
      action.setAttribute('title', String(this.state.action_label));
      action.setAttribute('aria-label', String(this.state.action_label));
      appendIcon(action, 'lightbulb', String(this.state.action_label));
      root.append(action);
    }
  }
}
