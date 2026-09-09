# Odoo UI parity sub-plans

These UI-only plans are approval gates for Odoo 19 parity. Each records addon/source status, visible menus/actions/views, backend fixtures, shared primitives, screenshots, and acceptance checks.

## Per-module template

1. Reference/source availability, addon version, demo data, Core3 service, and scope.
2. Complete menu/action/route/view inventory, including populated, empty, mobile, workflow, permission, and error states.
3. Backend datasource `mock_data`: exact records, relationships, totals, chart values, and named state variations needed by every visible screen.
4. Shared primitives to reuse or assess.
5. Odoo/Core3 screenshots at `1440x900` and `390x844`, with route and fixture-state metadata.
6. Visual, interaction, fixture, and offline-render acceptance criteria.

## Planning gate

A module stays `planning` until all six sections are complete, every visible datasource has deterministic backend `mock_data`, and the Odoo/Core3 screenshot and acceptance matrix is reviewed. Only then may it be marked `ready` and enter implementation.

[`screen-mock-data.md`](./screen-mock-data.md) is authoritative: backend datasource YAML owns `mock_data`; page-layout YAML names datasources and remains layout-only. Website, eCommerce, Blog, and Forum are YAML-driven composition modules, so these plans do not authorize copying bespoke Odoo frontend code.
