# Functionality checklist

| Check | Result |
| --- | --- |
| Page/API separation and matching `page.id` | pass |
| Odoo portal controller/template/report source mapping | pass |
| Portal task actor/company/access scope | pass |
| Durable report-run migration and deterministic seed | pass |
| Report run and persisted lines after file-backed restart | pass |
| Missing, empty, stale-entry, stale-task, actor, and company guards | pass |
| Read-only report preview with Print/Back actions | pass by contract/test |
| Authenticated Odoo desktop source behavior | pass; observed through bsk |
| Authenticated Odoo mobile source behavior | blocked; session closed before capture |
| Authenticated Core3 desktop/mobile behavior | blocked; BrowserSkill session closed before Core3 capture |
