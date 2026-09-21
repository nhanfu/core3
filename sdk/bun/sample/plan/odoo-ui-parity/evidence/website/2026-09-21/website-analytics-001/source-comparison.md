# Source comparison and gap closure

| Odoo source behavior | Core3 before slice | Core3 result |
| --- | --- | --- |
| Website > Reporting > Analytics, `website-analytics` client action | Manifest exposed `Website Analysis`; page-owned SQL had no API fragment | Manifest label, breadcrumb, route, and API/page join now expose Analytics |
| Website choices and current-site analytics context | No durable analytics read model | `website_analysis_websites`, site-filterable totals, and daily traffic sources |
| Plausible/no-share-url dashboard states | No source-backed analytics contract | `website_analytics_daily` provides a durable first-party read model; external Plausible secrets are not stored |
| Authenticated read boundary | Page stub only | Page and all API sources require `website.read`; 403/503 contracts are explicit |

Remaining gap: Odoo Website is not installed/exposed in the supplied live
session, and Core3 whole-app startup is blocked by unrelated CRM YAML changes;
paired visual comparison and module sign-off remain open.
