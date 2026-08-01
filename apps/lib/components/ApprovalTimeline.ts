import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

export class ApprovalTimeline extends BaseComponent {
  def: any;

  constructor(id: string, state: any = {}, def: any = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container: HTMLElement) {
    const events = Array.isArray(this.state.events) ? this.state.events : [];
    const root = html.take(container).section
      .className('rounded-lg border border-gray-200 bg-white p-5')
      .getContext();
    html.take(root).h3
      .className('mb-4 text-sm font-semibold text-gray-900')
      .text(String(this.def.title || 'Approval history'));

    if (!events.length) {
      const empty = this.def.empty_state || {};
      html.take(root).p.className('text-sm text-gray-400').text(empty.title || 'No activity yet');
      if (empty.description) html.take(root).p.className('mt-1 text-sm text-gray-400').text(empty.description);
      return;
    }

    const list = html.take(root).ul.className('space-y-0').getContext();
    events.forEach((event: any, index: number) => {
      const row = html.take(list).li.className('relative flex gap-3 pb-5 last:pb-0').getContext();
      const rail = html.take(row).div.className('relative flex w-5 flex-none justify-center').getContext();
      html.take(rail).span.className('mt-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-50');
      if (index < events.length - 1) {
        html.take(rail).span.className('absolute left-1/2 top-4 h-full w-px -translate-x-1/2 bg-gray-200');
      }
      const content = html.take(row).div.className('min-w-0 flex-1').getContext();
      const header = html.take(content).div.className('flex flex-wrap items-center justify-between gap-2').getContext();
      const configuredAction = event[this.def.action_field || 'action_label'];
      const rawAction = event.action;
      const actionLabel = (rawAction && this.def.action_labels?.[rawAction]) || configuredAction || rawAction || 'Activity';
      html.take(header).span
        .className('text-sm font-medium text-gray-900')
        .text(String(actionLabel));
      html.take(header).span
        .className('text-xs text-gray-400')
        .text(String(event[this.def.timestamp_field || 'created_at'] || ''));
      html.take(content).p
        .className('mt-1 text-sm text-gray-500')
        .text(String(event[this.def.detail_field || 'detail'] || ''));
      const actor = event[this.def.actor_field || 'actor_name'];
      if (actor) {
        html.take(content).p.className('mt-1 text-xs text-gray-400').text(String(actor));
      }
    });
  }
}
