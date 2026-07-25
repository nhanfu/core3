/**
 * YAML-driven page renderer — no hand-coded page JS files needed.
 *
 * Takes a declarative page config (parsed from YAML) and:
 *   1. Checks auth permissions
 *   2. Fetches all declared datasources via POST /api/query
 *   3. Renders toolbar, filters, and components (StatRow, GridView, TabGroup)
 *   4. Wires CRUD actions (form modal, delete, patch, navigate)
 *   5. Handles server-side pagination and filter re-fetching
 *
 * Usage:
 *   import { renderPage } from '/lib/page-renderer.js';
 *   const config = jsyaml.load(yamlString);
 *   await renderPage(config, { container: outlet });
 */
export declare function register(name: any, Ctor: any): void;
export declare function registerAll(map: any): void;
export declare function renderPage(config: any, { container }?: {
    container?: HTMLElement;
}): Promise<{
    dataMap: {};
    ctx: {
        user: any;
        row: {};
        state: Record<string, string>;
    };
}>;
