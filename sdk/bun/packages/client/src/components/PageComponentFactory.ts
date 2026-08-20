export type PageComponentRenderer = (definition: any, target: HTMLElement) => Promise<unknown> | unknown;

/** Resolves declarative page component types without making the page renderer a type switch. */
export class PageComponentFactory {
  private readonly renderers = new Map<string, PageComponentRenderer>();

  register(type: string, renderer: PageComponentRenderer) {
    this.renderers.set(type, renderer);
    return this;
  }

  has(type?: string) {
    return Boolean(type && this.renderers.has(type));
  }

  resolve(type?: string) {
    return type ? this.renderers.get(type) : undefined;
  }

  async render(definition: any, target: HTMLElement) {
    const renderer = this.resolve(definition?.type);
    if (!renderer) return false;
    await renderer(definition, target);
    return true;
  }
}
