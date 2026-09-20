# QA inventory

| Area | Result | Evidence |
| --- | --- | --- |
| Odoo model/action/menu trace | Pass | `source-comparison.md` and source paths listed there |
| Paired page/API YAML | Pass | focused test validates identifiers and action permissions |
| Durable migration/data | Pass | migrations 098/099 plus restart test |
| CRUD/workflow | Pass | top/bottom/up/down focused cases |
| Permission/company boundary | Pass | `ecommerce.write` and 403 company guard |
| Validation/concurrency | Pass | edge 409 and stale row-version 409 |
| Restart persistence | Pass | reopened DuckDB assertion |
| Core3 desktop/mobile UI | Blocked | `browser-check.md` |
| Authenticated Odoo comparison | Blocked | exact `/shop` 404 in `browser-check.md` |
| Module sign-off | Open | this is one bounded feature slice |
