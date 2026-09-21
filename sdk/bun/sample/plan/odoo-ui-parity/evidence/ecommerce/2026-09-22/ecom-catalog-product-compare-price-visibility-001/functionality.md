# Functionality matrix

| Case | Expected | Result |
| --- | --- | --- |
| ECOM-FUNC-078 | Odoo group/settings/form/template trace | pass |
| ECOM-WF-089 | Disabled default hides projections; enabled policy exposes valid compare-at values | pass |
| ECOM-PERM-085 | Read/write permissions, company scope, boolean validation, and stale guard | pass |
| ECOM-DATA-049 | Migration 162/163 replay is idempotent; raw stored values survive | pass |
| ECOM-RESTART-049 | Policy survives DuckDB close/reopen and migration replay | pass |
| ECOM-UI-071 | Authenticated desktop/mobile comparison | blocked: Odoo `/shop` 404 and Core3 ports unavailable |

The feature boundary is deliberately limited to visibility. Product and
variant compare-at values remain durable and editable through the existing
CRUD actions; only the catalog projections are gated.
