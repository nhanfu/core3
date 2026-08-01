import { describe, expect, it, vi } from 'vitest';
import { BaseComponent, ExternalWidgetAdapter } from '@core3/frontend';

type WidgetOptions = { value: string };
type WidgetInstance = { container: HTMLElement; value: string };

class TestWidgetAdapter extends ExternalWidgetAdapter<WidgetOptions, WidgetInstance> {
  createSpy = vi.fn((container: HTMLElement, options: WidgetOptions) => ({
    container,
    value: options.value,
  }));
  updateSpy = vi.fn((instance: WidgetInstance, options: WidgetOptions) => {
    instance.value = options.value;
  });
  destroySpy = vi.fn();

  protected create(container: HTMLElement, options: WidgetOptions) {
    return this.createSpy(container, options);
  }

  protected updateWidget(instance: WidgetInstance, options: WidgetOptions) {
    this.updateSpy(instance, options);
  }

  protected destroy(instance: WidgetInstance) {
    this.destroySpy(instance);
  }
}

class AdapterHost extends BaseComponent {
  draw(container: HTMLElement) {
    container.append(document.createElement('div'));
  }
}

describe('ExternalWidgetAdapter', () => {
  it('mounts, updates, and disposes a vendor widget', () => {
    const adapter = new TestWidgetAdapter();
    const container = document.createElement('div');

    adapter.mount(container, { value: 'first' });
    adapter.update({ value: 'second' });

    expect(adapter.isMounted).toBe(true);
    expect(adapter.container).toBe(container);
    expect(adapter.createSpy).toHaveBeenCalledWith(container, { value: 'first' });
    expect(adapter.updateSpy).toHaveBeenCalledOnce();

    adapter.dispose();
    adapter.dispose();

    expect(adapter.isMounted).toBe(false);
    expect(adapter.container).toBeNull();
    expect(adapter.destroySpy).toHaveBeenCalledOnce();
  });

  it('releases an existing widget before mounting into another container', () => {
    const adapter = new TestWidgetAdapter();
    const first = document.createElement('div');
    const second = document.createElement('div');

    adapter.mount(first, { value: 'first' });
    adapter.mount(second, { value: 'second' });

    expect(adapter.destroySpy).toHaveBeenCalledOnce();
    expect(adapter.container).toBe(second);
    expect(adapter.createSpy).toHaveBeenCalledTimes(2);
  });

  it('rejects updates before mount', () => {
    const adapter = new TestWidgetAdapter();
    expect(() => adapter.update({ value: 'missing' })).toThrow('before it is mounted');
  });
});

describe('BaseComponent external-widget lifecycle', () => {
  it('updates a registered adapter and disposes it during redraw', () => {
    const host = new AdapterHost('host');
    const adapter = new TestWidgetAdapter();
    const container = document.createElement('div');
    const widgetContainer = document.createElement('div');

    host.mount(container);
    host.mountAdapter('editor', adapter, widgetContainer, { value: 'initial' });
    host.updateAdapter<WidgetOptions>('editor', { value: 'updated' });
    host.redraw();

    expect(adapter.updateSpy).toHaveBeenCalledWith(expect.anything(), { value: 'updated' });
    expect(adapter.destroySpy).toHaveBeenCalledOnce();
    expect(adapter.isMounted).toBe(false);
  });

  it('disposes a replaced adapter and rejects unknown adapter updates', () => {
    const host = new AdapterHost('host');
    const first = new TestWidgetAdapter();
    const second = new TestWidgetAdapter();
    const container = document.createElement('div');

    host.mountAdapter('widget', first, container, { value: 'first' });
    host.mountAdapter('widget', second, container, { value: 'second' });

    expect(first.destroySpy).toHaveBeenCalledOnce();
    expect(() => host.updateAdapter<WidgetOptions>('missing', { value: 'x' }))
      .toThrow('No external widget adapter is mounted for key: missing');
  });

  it('disposes child-owned adapters when the component tree is disposed', () => {
    const root = new AdapterHost('root');
    const child = root.createChild(AdapterHost, 'child', {});
    const adapter = new TestWidgetAdapter();

    child.mountAdapter('widget', adapter, document.createElement('div'), { value: 'child' });
    root.dispose();

    expect(adapter.destroySpy).toHaveBeenCalledOnce();
    expect(child._container).toBeNull();
  });
});
