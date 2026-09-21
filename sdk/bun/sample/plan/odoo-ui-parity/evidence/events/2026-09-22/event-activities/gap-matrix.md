# Gap matrix

| Area | Status | Evidence / residual |
| --- | --- | --- |
| Odoo source contract | pass | `odoo-analysis.md` and local source paths |
| Page/API YAML separation | pass | Matching `event-detail` page/API ids |
| Durable persistence | pass | Migration 036 and restart test |
| Permissions | pass for bounded actions | `events.read` datasource, `events.write` mutations; full actor matrix remains open |
| Workflow/state guards | pass | Actor, type, content, date, cancelled, planned, and stale-version checks |
| Desktop browser workflow | pass | Authenticated Core3 before/after captures |
| Odoo desktop/mobile reference | pass | Paired reference captures |
| Core3 mobile responsive visual | conditional | DOM width/overflow pass; screenshot endpoint returned 1916px under 390px emulation |
| Full Events parity | open | Broader route, actor, and visual coverage is not part of this bounded slice |
