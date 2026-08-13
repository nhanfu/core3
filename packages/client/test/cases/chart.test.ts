import { describe, expect, it } from 'vitest';
import { Chart } from '@core3/client/components/Chart';

describe('Chart', () => {
  it('renders a localized empty state and accessible chart label', () => {
    const container = document.createElement('div');
    new Chart('empty-chart', { title: 'Doanh thu', labels: [], data: [], series: [] }, { title: 'Doanh thu' }).mount(container);

    expect(container.querySelector('canvas')?.getAttribute('role')).toBe('img');
    expect(container.querySelector('canvas')?.getAttribute('aria-label')).toBe('Doanh thu');
    expect(container.textContent).toContain('Không có dữ liệu biểu đồ');
  });

  it('exposes a readable data summary for non-empty charts', () => {
    const container = document.createElement('div');
    const canvas = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (() => ({
      clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, arc() {}, closePath() {}, fillText() {}, fill() {},
    })) as typeof canvas;
    try {
      new Chart('summary-chart', { labels: ['Jan'], data: [12], series: [] }, { title: 'Doanh thu' }).mount(container);
      expect(container.querySelector('.sr-only')?.textContent).toBe('Jan: 12');
    } finally {
      HTMLCanvasElement.prototype.getContext = canvas;
    }
  });
});
