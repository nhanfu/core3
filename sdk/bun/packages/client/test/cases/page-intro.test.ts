import { afterEach, describe, expect, it } from 'vitest';
import { PageIntro } from '@core3/client/components/PageIntro';

function mount(component: PageIntro) {
  const container = document.createElement('div');
  component.mount(container);
  return container;
}

describe('PageIntro', () => {
  afterEach(() => {
    delete (globalThis as any).__CORE3_USER__;
  });

  it('renders the authenticated user greeting and declarative copy', () => {
    (globalThis as any).__CORE3_USER__ = { name: 'Admin User' };
    const container = mount(new PageIntro('dashboard-intro', {
      greeting: 'Xin chào',
      title: 'Tổng quan vận hành',
      description: 'Theo dõi hoạt động hôm nay',
    }));

    expect(container.textContent).toContain('Xin chào, Admin User');
    expect(container.textContent).toContain('Tổng quan vận hành');
    expect(container.textContent).toContain('Theo dõi hoạt động hôm nay');
  });

  it('supports the compact dashboard layout with a right-aligned greeting', () => {
    (globalThis as any).__CORE3_USER__ = { name: 'Admin User' };
    const container = mount(new PageIntro('dashboard-intro', {
      greeting: 'Xin chào',
      title: 'Tổng quan',
      greeting_side: 'right',
      compact: true,
      action_label: 'Mẹo',
    }));

    expect(container.querySelector('.page-intro-compact')).not.toBeNull();
    expect(container.querySelector('.page-intro-greeting')?.textContent).toBe('Xin chào, Admin User');
    expect(container.querySelector('h2')?.textContent).toBe('Tổng quan');
    expect(container.querySelector('.page-intro-action svg')).not.toBeNull();
    expect(container.querySelector('.page-intro-action')?.textContent).toBe('');
  });
});
