import { describe, expect, it } from 'vitest';
import { ComingSoon } from '@core3/client/components/ComingSoon';

describe('ComingSoon', () => {
  it('renders declarative copy and an accessible heading relationship', () => {
    const container = document.createElement('div');
    const component = new ComingSoon('schedule-state', {
      eyebrow: 'Operations',
      title: 'Schedule is in development',
      description: 'Dispatch planning will be available here.',
    });

    component.mount(container);

    const section = container.querySelector('section');
    const heading = container.querySelector('h2');
    expect(section?.getAttribute('aria-labelledby')).toBe('schedule-state-title');
    expect(heading?.id).toBe('schedule-state-title');
    expect(container.textContent).toContain('Operations');
    expect(container.textContent).toContain('Schedule is in development');
    expect(container.textContent).toContain('Dispatch planning will be available here.');
  });

  it('renders an inline SVG without exposing decorative artwork to assistive technology', () => {
    const container = document.createElement('div');
    new ComingSoon('schedule-state', { icon: 'warning' }).mount(container);

    const artwork = container.querySelector('[data-icon="warning"]');
    expect(artwork?.getAttribute('aria-hidden')).toBe('true');
    expect(artwork?.querySelector('svg')).not.toBeNull();
    expect(artwork?.querySelector('svg path')?.getAttribute('d')).toContain('12 3');
  });
});
