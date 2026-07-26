# Currency Checklist

- Search, active/inactive tabs, CSV export/import, column chooser, and CRUD actions are visible.
- Fresh seeded query returned 3 currencies; `VND` is active with zero decimals.
- The currency grid displays server-owned rate-to-VND, effective-date, and source columns.
- `Đồng bộ tỷ giá` invokes the permission-gated `catalog.currencies.sync_rates` action, persists VND/USD/EUR rates, and records an activity event.
- Captures: `local-desktop.png`, `local-tablet.png`.
