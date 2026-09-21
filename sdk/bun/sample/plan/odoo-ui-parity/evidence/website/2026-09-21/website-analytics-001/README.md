# WEBSITE-ANALYTICS-001 evidence

Bounded Website Analytics parity slice for Odoo 19 `website.backend_dashboard`.

- Core3 route/menu: `/website-analysis`, `Website > Reporting > Analytics`.
- Core3 contracts: `services/website/pages/analysis.yaml` and
  `services/website/api/analysis.yaml`, joined by `page.id`.
- Durable storage: `services/website/migrations/20260921180000-011-website-analytics.yaml`.
- Deterministic data: `services/website/migrations/20260921181000-012-website-analytics-demo.yaml`.
- Focused proof: `test/website_analytics.integration.test.ts` — 2 tests, 17
  assertions passed.
- Browser result: blocked; see `browser-check.md`.

This is a bounded verified contract/data slice, not Website module sign-off.
