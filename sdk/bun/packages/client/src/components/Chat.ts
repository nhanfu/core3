import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

function relativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export class Chat extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state || { messages: [], inputValue: '' });
    this.def = def;
  }

  draw(container) {
    const { messages = [], inputValue = '' } = this.state;
    const { height = 400 } = this.def;

    const wrap = html.take(container).div
      .className('flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden')
      .style(`height: ${height}px;`)
      .getContext();

    const msgList = html.take(wrap).div
      .className('flex-1 overflow-y-auto p-4 flex flex-col gap-3')
      .getContext();

    for (const msg of messages) {
      const rowCls = msg.isOwn ? 'flex flex-col items-end' : 'flex flex-col items-start';
      const row = html.take(msgList).div.className(rowCls).getContext();

      html.take(row).span
        .className('text-xs text-gray-400 mb-1')
        .text(`${msg.sender} · ${relativeTime(msg.timestamp)}`);

      const bubbleCls = msg.isOwn
        ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm break-words'
        : 'bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-2 text-sm break-words';
      html.take(row).div.className(bubbleCls).style('max-width: 72%;').text(msg.text);
    }

    requestAnimationFrame(() => { msgList.scrollTop = msgList.scrollHeight; });

    const inputRow = html.take(wrap).div
      .className('flex gap-2 p-3 border-t border-gray-200 bg-gray-50')
      .getContext();

    const inp = html.take(inputRow).input.type('text')
      .className('flex-1 text-sm border border-gray-300 rounded-full px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500')
      .attr('placeholder', 'Type a message…')
      .value(inputValue)
      .getContext();

    const sendMessage = () => {
      const text = this.state.inputValue.trim();
      if (!text) return;
      this.submit('chat.send', { text });
      this.setState({ inputValue: '' }, false);
      html.take(inp).prop('value', '');
    };

    html.take(inp).event('input', e => {
      this.setState({ inputValue: e.target.value }, false);
    });

    html.take(inp).event('keydown', e => {
      if (e.key === 'Enter') sendMessage();
    });

    const sendBtn = html.take(inputRow).button
      .className('text-sm px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors font-medium shrink-0')
      .text('Send')
      .getContext();
    html.take(sendBtn).event('click', sendMessage);
  }
}
