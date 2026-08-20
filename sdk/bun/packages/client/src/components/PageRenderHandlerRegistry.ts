export type PageRenderHandler = (definition: any, target: HTMLElement) => Promise<unknown> | unknown;

/**
 * Resolves only the page handlers that need data orchestration around a
 * component. Component classes themselves are loaded by filename convention.
 */
export class PageRenderHandlerRegistry {
  constructor(private readonly handlers: Record<string, PageRenderHandler>) {}

  resolve(type?: string) {
    return type ? this.handlers[`render${type}`] : undefined;
  }

  async render(definition: any, target: HTMLElement) {
    const handler = this.resolve(definition?.type);
    if (!handler) return false;
    await handler(definition, target);
    return true;
  }
}
