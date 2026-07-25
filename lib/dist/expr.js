/**
 * Expression evaluator — evaluates server-stored expression strings.
 * Used for show_if, disabled_if, compute, default, validation in ComponentDef.
 *
 * Security: expressions run inside a sandboxed Function with only safe context vars.
 * They CANNOT access window, document, or global scope.
 */
const _cache = new Map();
function compile(expr) {
    if (_cache.has(expr))
        return _cache.get(expr);
    // eslint-disable-next-line no-new-func
    const fn = new Function('user', 'row', 'state', `"use strict"; return (${expr})`);
    _cache.set(expr, fn);
    return fn;
}
/**
 * Evaluate an expression string.
 * @param {string} expr  — JS expression, e.g. "row.status === 'active'"
 * @param {{ user?, row?, state? }} ctx
 * @returns {*}
 */
export function evalExpr(expr, ctx = {}) {
    if (!expr || typeof expr !== 'string')
        return undefined;
    const user = Object.freeze(ctx.user || {});
    const row = Object.freeze(ctx.row || {});
    const state = Object.freeze(ctx.state || {});
    try {
        return compile(expr)(user, row, state);
    }
    catch {
        return undefined;
    }
}
/**
 * Interpolate {row.field} / {state.key} placeholders in a template string.
 * @param {string} template  — e.g. "Hello {row.name}, you have {state.count} items"
 * @param {{ row?, state?, user? }} ctx
 * @returns {string}
 */
export function interpolate(template, ctx = {}) {
    if (!template || typeof template !== 'string')
        return String(template ?? '');
    return template.replace(/\{([\w.]+)\}/g, (_, path) => {
        const parts = path.split('.');
        let val = ctx;
        for (const p of parts)
            val = val?.[p];
        return val ?? '';
    });
}
