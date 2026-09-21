# Gap matrix

| Gap | Classification | Decision/evidence |
| --- | --- | --- |
| Durable contract activity schedule/complete lifecycle | implemented | Focused integration test and migration replay |
| Source renewal type, deadline, actor, company and stale guards | implemented | Odoo source comparison and API mutation guards |
| Full Odoo mail.activity relational widgets, followers and rich chatter | partial | Shared Core3 chatter is used; partner/user widgets remain outside this bounded slice |
| Odoo cron execution and external reminder delivery | deferred | No external reminder delivery is fabricated; persisted activity boundary is implemented |
| Live Odoo Fleet desktop/mobile comparison | blocked | Authenticated app launcher has no Fleet |
| Core3 authenticated desktop/mobile browser workflow | blocked | Runtime reached protected login; QA login did not complete |
