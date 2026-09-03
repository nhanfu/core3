import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export class TicketScreen extends BaseComponent {
  constructor(id: string, state: any = {}) {
    super(id, state);
  }

  draw(container: HTMLElement) {
    this.disposeChildren();
    const tickets = this.state.tickets || [];
    const session = this.state.session || {};

    const wrap = html.take(container).div.className('ticket-screen p-6 bg-white h-full overflow-y-auto').ele();

    const header = html.take(wrap).div.className('flex items-center justify-between mb-6').ele();
    html.take(header).h2.className('text-lg font-semibold text-gray-900').text('Open tickets').ele();
    if (session.name) {
      html.take(header).span.className('text-sm text-gray-500').text(session.name).ele();
    }

    if (!tickets.length) {
      const empty = html.take(wrap).div.className('flex flex-col items-center justify-center py-16 text-center').ele();
      html.take(empty).div.className('text-4xl mb-4').text('🎟').ele();
      html.take(empty).p.className('text-gray-500 text-sm').text('No open tickets in this session').ele();
      html.take(empty).button
        .className('mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors')
        .text('Start new ticket')
        .event('click', () => this.submit('new_ticket', {}))
        .ele();
      return;
    }

    const list = html.take(wrap).div.className('space-y-3').ele();
    for (const ticket of tickets) {
      const row = html.take(list).div
        .className('flex items-center gap-4 p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors group')
        .ele();

      const info = html.take(row).div.className('flex-1 min-w-0').ele();
      html.take(info).div.className('text-sm font-semibold text-gray-900').text(ticket.name || '—').ele();
      if (ticket.partner_name) {
        html.take(info).div.className('text-xs text-gray-500 mt-0.5').text(ticket.partner_name).ele();
      }
      html.take(info).div.className('text-xs text-gray-400 mt-0.5').text(ticket.date_order || '').ele();

      const right = html.take(row).div.className('flex flex-col items-end gap-1').ele();
      html.take(right).span.className('text-sm font-bold text-gray-900').text(`$${Number(ticket.amount_total || 0).toFixed(2)}`).ele();

      const stateColor = ticket.state === 'Paid' ? 'bg-green-100 text-green-700'
        : ticket.state === 'New' ? 'bg-blue-100 text-blue-700'
        : 'bg-gray-100 text-gray-500';
      html.take(right).span.className(`text-xs px-2 py-0.5 rounded-full font-medium ${stateColor}`).text(ticket.state || '—').ele();

      const actions = html.take(row).div.className('flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity').ele();
      if (ticket.state === 'New') {
        html.take(actions).button
          .className('px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors')
          .text('Resume')
          .event('click', (e: Event) => { e.stopPropagation(); this.submit('resume_ticket', { ticket_id: ticket.id }); })
          .ele();
        html.take(actions).button
          .className('px-3 py-1.5 bg-white border border-red-300 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors')
          .text('Cancel')
          .event('click', (e: Event) => { e.stopPropagation(); this.submit('cancel_ticket', { ticket_id: ticket.id }); })
          .ele();
      }
    }
  }
}
