# Event activity scheduling and completion

- Feature ID: `EVENT-ACTIVITY-001`
- Date: 2026-09-22
- Odoo source: `/home/nhanjs/projects/odoo`, local Odoo 19 revision `65975996`
- Reference: `http://localhost:8069`, database `core3_reference`, browser instance `245ea108`
- Core3 route: `http://localhost:4025/events/event-detail?id=event-demo-001`
- Core3 fixture: `event-demo-001` / Design Fair Los Angeles

Artifacts are kept outside Git under `/tmp/core3-odoo-parity/events-activity-20260922/`:

| Artifact | SHA-256 | Meaning |
| --- | --- | --- |
| `odoo-desktop-schedule-dialog.png` | `9542a2d6c4593edea4bfedf93d4c71e973da15b9e0fbed25d14ad1d35586b0d2` | Authenticated Odoo activity dialog, 1916x833 |
| `odoo-mobile-schedule-dialog.png` | `eedd2f8026f32c417a87de90488442a393233b68533305ff448d7c26a0b80f73` | Authenticated Odoo activity sheet, 390x844 |
| `core3-desktop-before.png` | `2a75c96d74e535869be589b9f5a303b1136c09a2d91b9cb4df25ffd94ffd4de6` | Core3 authenticated detail before scheduling, 1916x833 |
| `core3-desktop-after.png` | `97d7959cadf03df3be5f7243aec454bef51301d93e175d51e9bcf8b39252ef43` | Core3 authenticated detail after completion, 1916x833 |

The `core3-mobile-after*.png` files are not evidence: bsk returned 1916x833
output while the emulated viewport was 390x844. The authenticated mobile DOM
evaluation itself returned `innerWidth=390`, `clientWidth=390`, and
`scrollWidth=390`.

See [odoo-analysis.md](odoo-analysis.md), [source-comparison.md](source-comparison.md),
[functionality-checklist.md](functionality-checklist.md), [test-results.md](test-results.md),
[verification.md](verification.md), and [gap-matrix.md](gap-matrix.md).
