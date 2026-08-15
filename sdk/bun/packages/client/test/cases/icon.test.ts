import { describe, expect, it } from 'vitest';
import { appendIcon, hasIcon } from '@core3/client/components/Icon';

describe('shared SVG icon adapter', () => {
  it('renders semantic and legacy navigation aliases as SVG icons', () => {
    const container = document.createElement('div');

    appendIcon(container, 'dashboard');
    appendIcon(container, '▦');

    expect(container.querySelectorAll('svg')).toHaveLength(2);
    expect(container.querySelectorAll('.svg-icon')).toHaveLength(2);
    expect(container.querySelectorAll('svg path, svg rect, svg circle')).not.toHaveLength(0);
  });

  it('reports the icons used by the MovedX shell as supported', () => {
    for (const name of ['search', 'panel', 'moon', 'sun', 'bell', 'clock', 'message', 'check', 'x', 'chevron-down', 'arrow-left', 'arrow-right', 'arrow-up', 'arrow-down', 'truck', 'lightbulb', 'image', 'edit', 'trash', 'sort', 'sort-ascending', 'sort-descending', '○', '◷']) {
      expect(hasIcon(name)).toBe(true);
    }
  });

  it('renders the visual fallback icons as SVG rather than text glyphs', () => {
    const container = document.createElement('div');
    for (const name of ['truck', 'lightbulb', 'image', 'file']) appendIcon(container, name);

    expect(container.querySelectorAll('svg')).toHaveLength(4);
    expect(container.textContent).toBe('');
  });

  it('keeps fluent SVG construction within the icon rendering budget', () => {
    const container = document.createElement('div');
    const start = performance.now();
    for (let index = 0; index < 1000; index++) appendIcon(container, index % 2 ? 'edit' : 'trash');
    const elapsed = performance.now() - start;

    expect(container.querySelectorAll('svg')).toHaveLength(1000);
    expect(elapsed).toBeLessThan(1000);
  });
});
