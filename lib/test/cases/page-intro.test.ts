import { afterEach, describe, expect, it } from 'vitest';
import { PageIntro } from '../../components/PageIntro.ts';

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
});
