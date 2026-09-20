# Source comparison

| Odoo behavior | Core3 implementation | Result |
| --- | --- | --- |
| Reporting → Stock menu/action | Existing `/stock-report` manifest/page route | Present |
| `stock.action_inventory_at_date` opens a modal date form | API `inventory_stock_at_date` server form with ISO text date | Present |
| Confirm reopens report with `to_date` context | Durable `inventory_stock_report_runs` context; report query uses latest company date and refreshes | Present |
| Deterministic current report state | Migration `0.0.23` seeds `2026-01-15` context | Present |
| Invalid date rejected | `TRY_CAST` plus 2000–2100 guard, 422 code | Present |
| Company-scoped report context | `inventory.read` page/action plus company guard | Present |
| Restart retains selected report date | File-backed DuckDB test and browser reload | Present |
| Desktop/mobile wizard comparison | Fresh Core3 and Odoo captures | Core3 pass; Odoo mobile control not exposed at 390px |

The page YAML contains only `StatRow`/`ListView` presentation. Datasources,
the report action, mutation, permissions, and refresh contract remain in the
API YAML.
