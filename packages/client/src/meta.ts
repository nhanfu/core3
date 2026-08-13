/**
 * Meta-model resolver — evaluates ComponentDef expressions in context.
 * Mirrors the core2 component meta pattern.
 */

import { evalExpr } from './expr.ts';

export function hasPermission(user: any, permission: string): boolean {
  if (!permission) return true;
  const permissions = user?.permissions || [];
  return permissions.includes('*') || permissions.includes(permission);
}

/**
 * Resolve a ComponentDef's expression fields against the current context.
 * Returns a resolved meta object indicating visibility, disabled state, and computed value.
 *
 * @param {object} def  — ComponentDef (may have show_if, disabled_if, compute, default)
 * @param {{ user?, row?, state? }} ctx
 * @returns {{ visible: boolean, disabled: boolean, value: * }}
 */
export function resolveMeta(def: any, ctx: any = {}) {
  const visible  = def.show_if     ? !!evalExpr(def.show_if,     ctx) : true;
  const disabled = def.disabled_if ? !!evalExpr(def.disabled_if, ctx) : false;
  let value;
  if (def.compute) {
    value = evalExpr(def.compute, ctx);
  } else if (def.default !== undefined && ctx.row?.[def.field] === undefined) {
    value = typeof def.default === 'string' ? evalExpr(def.default, ctx) ?? def.default : def.default;
  } else {
    value = ctx.row?.[def.field];
  }
  return { visible, disabled, value };
}

/**
 * Resolve an ActionDef's expression fields.
 * @param {object} action  — ActionDef (may have show_if, disabled_if)
 * @param {{ user?, row?, state? }} ctx
 * @returns {{ visible: boolean, disabled: boolean }}
 */
export function resolveAction(action: any, ctx: any = {}) {
  const visible  = hasPermission(ctx.user, action.permission)
    && (action.show_if ? !!evalExpr(action.show_if, ctx) : true);
  const disabled = action.disabled_if ? !!evalExpr(action.disabled_if, ctx) : false;
  return { visible, disabled };
}

/**
 * Validate a field value against the def's validation expression.
 * @param {object} def   — ComponentDef with optional validation string
 * @param {*} value      — current field value
 * @param {{ user?, row?, state? }} ctx
 * @returns {string|null}  — error message or null if valid
 */
export function validateField(def: any, value: any, ctx: any = {}) {
  if (!def.validation) return null;
  const result = evalExpr(def.validation, { ...ctx, row: { ...(ctx.row || {}), [def.field]: value } });
  if (result === true || result == null) return null;
  return typeof result === 'string' ? result : 'Invalid value';
}
