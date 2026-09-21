# Gap matrix

| Area | Status | Evidence / residual |
| --- | --- | --- |
| Odoo source contract | pass | Local model/view and authenticated reference analysis |
| Page/API YAML separation | pass | Matching `event-detail` ids |
| Durable persistence | pass | Migration 037 and restart test |
| Permissions | pass for bounded actions | `events.write` on both mutations; full actor matrix remains open |
| Workflow/state guards | pass | Actor, blank content, cancelled event, stale row, and atomic parent update |
| Unified chatter timeline | pass | Messages/notes union with existing activities |
| Odoo desktop/mobile reference | pass | Committed authenticated PNG captures |
| Core3 desktop/mobile visual workflow | conditional/open | Runtime reached port 4026, but capture was not run before requested session closure |
| Full Events parity | open | Broader route, actor, follower, attachment, and visual coverage remain outside this bounded slice |
