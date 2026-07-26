type Thread = { name: string; preview: string; messages: { mine?: boolean; text: string; time: string }[] };

const threads: Thread[] = [
  { name: 'Điều phối miền Nam', preview: 'Xe đã nhận lệnh', messages: [
    { text: 'Đơn DH-2026-0007 đã sẵn sàng điều xe.', time: '09:12' },
    { mine: true, text: 'Đã phân công xe CA-101-ABC.', time: '09:15' },
  ] },
  { name: 'Khách hàng Minh Long', preview: 'Cần cập nhật ETA', messages: [
    { text: 'Cho tôi xin ETA chuyến HCM – Đà Nẵng.', time: '08:42' },
    { mine: true, text: 'Dự kiến giao 16:30 hôm nay.', time: '08:48' },
  ] },
];

export async function mount(container: HTMLElement) {
  let active = 0;
  const root = document.createElement('div');
  root.className = 'rounded-lg border border-slate-200 bg-white';
  root.style.cssText = 'height:calc(100vh - 150px);min-height:560px;display:grid;grid-template-columns:300px minmax(0,1fr);overflow:hidden;';
  container.append(root);

  const sidebar = document.createElement('aside');
  sidebar.style.cssText = 'border-right:1px solid #e2e8f0;overflow:auto;';
  const heading = document.createElement('div');
  heading.style.cssText = 'padding:18px;font-weight:700;font-size:16px;border-bottom:1px solid #e2e8f0;';
  heading.textContent = 'Tin nhắn'; sidebar.append(heading);
  const list = document.createElement('div'); sidebar.append(list);
  const main = document.createElement('section'); main.style.cssText = 'display:flex;flex-direction:column;min-width:0;';
  root.append(sidebar, main);

  const render = () => {
    list.innerHTML = ''; main.innerHTML = '';
    threads.forEach((thread, index) => {
      const button = document.createElement('button'); button.type = 'button';
      button.style.cssText = `width:100%;padding:14px 16px;text-align:left;border:0;border-bottom:1px solid #f1f5f9;background:${index === active ? '#eff6ff' : '#fff'};cursor:pointer;`;
      button.innerHTML = `<div style="font-weight:600;color:#0f172a">${thread.name}</div><div style="font-size:12px;color:#64748b;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${thread.preview}</div>`;
      button.onclick = () => { active = index; render(); }; list.append(button);
    });
    const thread = threads[active];
    const header = document.createElement('div'); header.style.cssText = 'padding:18px;border-bottom:1px solid #e2e8f0;font-weight:700;'; header.textContent = thread.name;
    const messages = document.createElement('div'); messages.style.cssText = 'flex:1;overflow:auto;padding:20px;background:#f8fafc;display:flex;flex-direction:column;gap:10px;';
    thread.messages.forEach(message => { const bubble = document.createElement('div'); bubble.style.cssText = `max-width:70%;padding:10px 12px;border-radius:10px;align-self:${message.mine ? 'flex-end' : 'flex-start'};background:${message.mine ? '#2563eb' : '#fff'};color:${message.mine ? '#fff' : '#0f172a'};box-shadow:0 1px 2px rgba(0,0,0,.06);`; bubble.textContent = message.text; messages.append(bubble); });
    const composer = document.createElement('form'); composer.style.cssText = 'display:flex;gap:8px;padding:14px;border-top:1px solid #e2e8f0;';
    const input = document.createElement('input'); input.placeholder = 'Nhập tin nhắn...'; input.style.cssText = 'flex:1;border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;font:inherit;';
    const send = document.createElement('button'); send.className = 'btn btn-primary'; send.textContent = 'Gửi';
    composer.onsubmit = event => { event.preventDefault(); const text = input.value.trim(); if (!text) return; thread.messages.push({ mine: true, text, time: '' }); thread.preview = text; render(); };
    composer.append(input, send); main.append(header, messages, composer); messages.scrollTop = messages.scrollHeight;
  };
  render();
}
