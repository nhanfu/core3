/**
 * Lifecycle wrapper for a DOM widget owned by a third-party library.
 *
 * Concrete adapters keep the vendor-specific constructor, update API, and
 * destruction API behind this small contract. Components own the adapter and
 * therefore decide when it is mounted or released; pages never need to reach
 * into a vendor instance directly.
 */
export abstract class ExternalWidgetAdapter<TOptions = unknown, TWidget = unknown> {
  private instance: TWidget | undefined;
  private host: HTMLElement | null = null;

  /** The DOM element currently hosting this widget, or null after disposal. */
  get container(): HTMLElement | null {
    return this.host;
  }

  /** Whether a vendor widget instance is currently active. */
  get isMounted(): boolean {
    return this.instance !== undefined;
  }

  /**
   * Create and attach the vendor widget. Mounting an already-mounted adapter
   * releases the old instance first, which makes moving it to a new DOM node
   * safe during a component redraw.
   */
  mount(container: HTMLElement, options: TOptions): void {
    this.dispose();
    const instance = this.create(container, options);
    this.instance = instance;
    this.host = container;
  }

  /** Apply changed options without recreating the vendor widget. */
  update(options: TOptions): void {
    if (this.instance === undefined) {
      throw new Error('Cannot update an external widget before it is mounted.');
    }
    this.updateWidget(this.instance, options);
  }

  /** Release the vendor widget. Safe to call more than once. */
  dispose(): void {
    const instance = this.instance;
    this.instance = undefined;
    this.host = null;

    if (instance !== undefined) {
      this.destroy(instance);
    }
  }

  /** Construct the vendor widget and attach it to the supplied element. */
  protected abstract create(container: HTMLElement, options: TOptions): TWidget;

  /** Apply a state/options change to an existing vendor widget. */
  protected abstract updateWidget(instance: TWidget, options: TOptions): void;

  /** Release listeners, DOM, and resources created by the vendor widget. */
  protected abstract destroy(instance: TWidget): void;
}
