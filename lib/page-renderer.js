/**
 * YAML-driven page renderer.
 *
 * Takes a declarative page config (parsed from YAML) and:
 *   1. Resolves datasources (mock or HTTP)
 *   2. Instantiates components from the component type registry
 *   3. Mounts the component tree into named containers
 *
 * Usage:
 *   import { renderPage } from '/lib/page-renderer.js';
 *   const config = jsyaml.load(yamlString);
 *   await renderPage(config, { mockData });
 */

import { evalExpr, interpolate } from './expr.js';
import { resolveMeta, resolveAction } from './meta.js';
import { navigate, getPageParams } from './navigate.js';

// ── Component registry ────────────────────────────────────────────────────────

const registry = new Map();

export function register(name, Ctor) {
  registry.set(name, Ctor);
}

export function registerAll(map) {
  for (const [k, v] of Object.entries(map)) registry.set(k, v);
}

// ── Instantiate a component from a ComponentDef ────────────────────────────────

function instantiate(def, ctx = {}) {
  const Ctor = registry.get(def.type);
  if (!Ctor) {
    console.warn(`[page-renderer] Unknown component type: ${def.type}`);
    return null;
  }

  const resolved = resolveMeta(def, ctx);
  const initialState = { value: resolved.value };

  const comp = new Ctor(def.id || def.type, initialState, def);

  if (def.components?.length) {
    for (const childDef of def.components) {
      const child = instantiate(childDef, ctx);
      if (child) {
        child.parent = comp;
        comp.children.push(child);
      }
    }
  }

  return comp;
}

// ── Datasource resolution ─────────────────────────────────────────────────────

async function loadSource(source, mockData = {}, params = {}) {
  if (mockData[source.id]) {
    const rows = mockData[source.id];
    return { data: rows, meta: { total: rows.length, page: 1, pageSize: rows.length } };
  }
  if (source.protocol === 'http') {
    const { client } = await import('./client.js');
    const { createQuery } = await import('./dtos.js');
    return client.query(createQuery({ sourceId: source.id, params }));
  }
  return { data: [], meta: { total: 0, page: 1, pageSize: 25 } };
}

// ── Action handler ────────────────────────────────────────────────────────────

function makeActionHandler(actions = [], ctx) {
  return async (actionId, params, source) => {
    const def = actions.find(a => a.id === actionId);
    if (!def) {
      console.log(`[page-renderer] unhandled action: ${actionId}`, params);
      return {};
    }

    const resolved = resolveAction(def, { ...ctx, state: params });
    if (!resolved.visible || resolved.disabled) return {};

    if (def.navigate_to) {
      navigate(def.navigate_to, def.params ? evalExpr(`(${JSON.stringify(def.params)})`, ctx) : params);
      return {};
    }

    if (def.confirm) {
      const ok = confirm(interpolate(def.confirm, { ...ctx, state: params }));
      if (!ok) return {};
    }

    return { action: actionId, params };
  };
}

// ── Main render function ──────────────────────────────────────────────────────

export async function renderPage(config, { mockData = {}, container = document.body } = {}) {
  const pageParams = getPageParams();
  const ctx = { user: window.__CORE3_USER__ || {}, row: {}, state: pageParams };

  const dataMap = {};
  if (config.datasources) {
    await Promise.all(
      config.datasources.map(async src => {
        const result = await loadSource(src, mockData, pageParams);
        dataMap[src.id] = result;
      })
    );
  }

  const actionHandler = makeActionHandler(config.actions || [], ctx);

  if (config.title) {
    const titleEl = container.querySelector('[data-page-title]');
    if (titleEl) titleEl.textContent = config.title;
    document.title = config.title;
  }

  for (const compDef of config.components || []) {
    const mountEl = compDef.container
      ? container.querySelector(`#${compDef.container}`) || container
      : container;

    const comp = instantiate(compDef, ctx);
    if (!comp) continue;

    if (compDef.source && dataMap[compDef.source]) {
      comp.setState(dataMap[compDef.source], false);
    }

    comp._onAction = actionHandler;
    comp.mount(mountEl);
  }

  return { dataMap, ctx };
}
