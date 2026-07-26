import { html } from '@core3/framework/html.ts';
import { appendIcon } from '@core3/framework/components/Icon.ts';

const COPY: Record<string, string> = {
  '/schedule': 'Lịch điều đang được hoàn thiện, giống trạng thái hiện tại của hệ thống tham chiếu.',
};

export async function mount(container: HTMLElement) {
  const path = window.location.hash.slice(1).split('?')[0] || '/dashboard';
  const title = document.querySelector('.header-title')?.textContent || 'Trang chức năng';
  const card = html.take(container).div.className('parity-placeholder').getContext();
  const icon = html.take(card).div.className('parity-placeholder-icon').getContext();
  appendIcon(icon, path === '/schedule' ? 'calendar' : 'file');
  html.take(card).h2.className('parity-placeholder-title').text(title);
  html.take(card).p.className('parity-placeholder-copy').text(
    COPY[path] || 'Chức năng này sẽ được thay thế bằng trang YAML hoàn chỉnh trong đợt triển khai hiện tại.'
  );
}
