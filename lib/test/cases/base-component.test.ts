/**
 * Test cases for BaseComponent
 *
 * NOT YET RUNNABLE — requires @core3/frontend implementation + vitest/jest setup.
 * These cases document the expected behavior contract.
 *
 * Run after setup: npx vitest run cases/base-component.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseComponent } from '@core3/frontend';

// ─── Minimal concrete component for testing ──────────────────────────────────

class TestComponent extends BaseComponent<{ count: number; label: string }> {
  drawCalls = 0;
  lastContainer: HTMLElement | null = null;

  draw(container: HTMLElement) {
    this.drawCalls++;
    this.lastContainer = container;
    container.innerHTML = `<span>${this.state.label}: ${this.state.count}</span>`;
  }
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

describe('draw()', () => {
  it('receives the container element', () => {
    const comp = new TestComponent('c1', { count: 0, label: 'test' });
    const container = document.createElement('div');
    comp.draw(container);
    expect(comp.lastContainer).toBe(container);
  });

  it('renders state into the container', () => {
    const comp = new TestComponent('c1', { count: 5, label: 'clicks' });
    const container = document.createElement('div');
    comp.draw(container);
    expect(container.innerHTML).toContain('clicks: 5');
  });
});

// ─── setState ────────────────────────────────────────────────────────────────

describe('setState()', () => {
  let comp: TestComponent;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    comp = new TestComponent('c1', { count: 0, label: 'x' });
    comp.mount(container);
  });

  it('merges partial state (does not replace the full state object)', () => {
    comp.setState({ count: 3 });
    expect(comp.state.label).toBe('x');  // preserved
    expect(comp.state.count).toBe(3);
  });

  it('triggers redraw by default (redraw=true)', () => {
    const before = comp.drawCalls;
    comp.setState({ count: 1 });
    expect(comp.drawCalls).toBe(before + 1);
  });

  it('skips redraw when passed false', () => {
    const before = comp.drawCalls;
    comp.setState({ count: 99 }, false);
    expect(comp.drawCalls).toBe(before);   // no extra draw
    expect(comp.state.count).toBe(99);     // state still updated
  });

  it('batching: multiple false then one true triggers exactly one redraw', () => {
    const before = comp.drawCalls;
    comp.setState({ count: 1 }, false);
    comp.setState({ count: 2 }, false);
    comp.setState({ count: 3 }, false);
    comp.setState({ label: 'done' });  // redraw=true (default)
    expect(comp.drawCalls).toBe(before + 1);
    expect(comp.state.count).toBe(3);
    expect(comp.state.label).toBe('done');
  });

  it('setState after mount clears and redraws the container', () => {
    comp.setState({ count: 7 });
    expect(container.innerHTML).toContain('x: 7');
  });
});

// ─── Tree traversal ──────────────────────────────────────────────────────────

describe('parent / children / root', () => {
  it('parent is null on a top-level component', () => {
    const root = new TestComponent('root', { count: 0, label: 'root' });
    expect(root.parent).toBeNull();
  });

  it('createChild registers the child in children array', () => {
    const root = new TestComponent('root', { count: 0, label: 'root' });
    const child = root.createChild(TestComponent, { count: 1, label: 'child' });
    expect(root.children).toContain(child);
    expect(root.children.length).toBe(1);
  });

  it('child.parent points to the parent that created it', () => {
    const root = new TestComponent('root', { count: 0, label: 'root' });
    const child = root.createChild(TestComponent, { count: 1, label: 'child' });
    expect(child.parent).toBe(root);
  });

  it('root resolves to the top-level component regardless of depth', () => {
    const root = new TestComponent('root', { count: 0, label: 'root' });
    const child = root.createChild(TestComponent, { count: 0, label: 'child' });
    const grandchild = child.createChild(TestComponent, { count: 0, label: 'gc' });
    expect(grandchild.root).toBe(root);
    expect(child.root).toBe(root);
    expect(root.root).toBe(root);
  });

  it('children array preserves insertion order', () => {
    const root = new TestComponent('root', { count: 0, label: 'root' });
    const a = root.createChild(TestComponent, { count: 0, label: 'a' });
    const b = root.createChild(TestComponent, { count: 0, label: 'b' });
    const c = root.createChild(TestComponent, { count: 0, label: 'c' });
    expect(root.children).toEqual([a, b, c]);
  });
});

// ─── find() ──────────────────────────────────────────────────────────────────

describe('find()', () => {
  it('returns itself when id matches', () => {
    const comp = new TestComponent('myId', { count: 0, label: '' });
    expect(comp.find('myId')).toBe(comp);
  });

  it('finds a direct child by id', () => {
    const root = new TestComponent('root', { count: 0, label: '' });
    const child = root.createChild(TestComponent, { count: 0, label: '' });
    Object.defineProperty(child, 'id', { value: 'child-id' });
    expect(root.find('child-id')).toBe(child);
  });

  it('finds a grandchild (depth-first)', () => {
    const root = new TestComponent('root', { count: 0, label: '' });
    const child = root.createChild(TestComponent, { count: 0, label: '' });
    const gc = child.createChild(TestComponent, { count: 0, label: '' });
    Object.defineProperty(gc, 'id', { value: 'gc-id' });
    expect(root.find('gc-id')).toBe(gc);
  });

  it('returns null when id is not in tree', () => {
    const root = new TestComponent('root', { count: 0, label: '' });
    expect(root.find('ghost')).toBeNull();
  });
});

// ─── submit() ────────────────────────────────────────────────────────────────

describe('submit()', () => {
  it('resolves with the server response', async () => {
    const comp = new TestComponent('c1', { count: 0, label: '' });
    // Framework wires submit() to the action handler pipeline.
    // In integration tests, mock the transport layer.
    const mockHandler = vi.fn().mockResolvedValue({ ok: true, id: '42' });
    (comp as unknown as { _transport: unknown })._transport = { submit: mockHandler };

    const result = await comp.submit('approve', { id: '42' });
    expect(result).toEqual({ ok: true, id: '42' });
  });

  it('passes action name and params to the transport', async () => {
    const comp = new TestComponent('c1', { count: 0, label: '' });
    const mockHandler = vi.fn().mockResolvedValue({});
    (comp as unknown as { _transport: unknown })._transport = { submit: mockHandler };

    await comp.submit('delete_item', { id: '99', reason: 'test' });
    expect(mockHandler).toHaveBeenCalledWith('delete_item', { id: '99', reason: 'test' });
  });

  it('rejects when the action name does not exist', async () => {
    const comp = new TestComponent('c1', { count: 0, label: '' });
    await expect(comp.submit('nonexistent_action', {})).rejects.toThrow();
  });
});

// ─── redraw() ────────────────────────────────────────────────────────────────

describe('redraw()', () => {
  it('clears the container and calls draw() again by default', () => {
    const comp = new TestComponent('c1', { count: 0, label: 'x' });
    const container = document.createElement('div');
    comp.mount(container);
    const before = comp.drawCalls;
    comp.redraw();
    expect(comp.drawCalls).toBe(before + 1);
  });

  it('reflects current state after redraw', () => {
    const comp = new TestComponent('c1', { count: 0, label: 'x' });
    const container = document.createElement('div');
    comp.mount(container);
    comp.setState({ count: 42 }, false);
    comp.redraw();
    expect(container.innerHTML).toContain('x: 42');
  });
});
