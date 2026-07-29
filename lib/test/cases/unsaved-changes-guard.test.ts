import { describe, expect, it, vi } from 'vitest';
import { UnsavedChangesGuard } from '../../services/UnsavedChangesGuard.ts';

describe('UnsavedChangesGuard', () => {
  it('allows clean navigation without prompting', () => {
    const confirm = vi.fn(() => false);
    const guard = new UnsavedChangesGuard(confirm);

    expect(guard.canLeave()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('keeps dirty state when navigation is cancelled', () => {
    const guard = new UnsavedChangesGuard(() => false);
    guard.markDirty();

    expect(guard.canLeave()).toBe(false);
    expect(guard.isDirty).toBe(true);
  });

  it('resets dirty state after confirmed navigation', () => {
    const guard = new UnsavedChangesGuard(() => true);
    guard.markDirty();

    expect(guard.canLeave()).toBe(true);
    expect(guard.isDirty).toBe(false);
  });
});
