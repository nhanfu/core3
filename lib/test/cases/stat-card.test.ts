import { describe, expect, it, vi } from 'vitest';
import { StatCard } from '../../components/StatCard.ts';

describe('StatCard navigation', () => {
  it('supports mouse and keyboard activation for navigable stats', () => {
    const container = document.createElement('div');
    const onNavigate = vi.fn();
    new StatCard('draft-orders', { label: 'Đơn nháp', value: 3, navigate_to: '/orders', onNavigate }).mount(container);

    const card = container.querySelector('[role="link"]') as HTMLElement;
    card.click();
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onNavigate).toHaveBeenCalledTimes(2);
    expect(onNavigate).toHaveBeenCalledWith('/orders');
  });
});
