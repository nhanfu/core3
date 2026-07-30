export type ConfirmLeave = (message: string) => boolean;

/** Tracks dirty client state and protects in-app navigation. */
export class UnsavedChangesGuard {
  private dirty = false;
  private readonly confirmLeave: ConfirmLeave;

  constructor(confirmLeave: ConfirmLeave = message => typeof globalThis.confirm === 'function' ? globalThis.confirm(message) : false) {
    this.confirmLeave = confirmLeave;
  }

  get isDirty() { return this.dirty; }

  markDirty() { this.dirty = true; }
  reset() { this.dirty = false; }

  canLeave(message = 'You have unsaved changes. Leave this record?') {
    if (!this.dirty) return true;
    const allowed = this.confirmLeave(message);
    if (allowed) this.reset();
    return allowed;
  }
}
