# Browser check — WEBSITE-PAGE-DETAIL-PUBLISH-001

- Target: `http://localhost:8069`, database `core3_reference`
- BrowserSkill instance: `245ea108`
- Agent session: `vfmi` (stopped)
- Result: blocked for authenticated Website workflow evidence.

The two existing authenticated Odoo tabs were listed, but borrowing tab
`1770663883` was rejected because session `qsyw` already owned it; borrowing
tab `1770663889` was rejected because session `gocr` already owned it. The
task-created authenticated tab reached `/odoo?db=core3_reference` and showed
Discuss. `/odoo/website-pages` returned the Discuss shell, while the direct
`/website-pages` route returned Odoo 404. The authenticated actor exposes no
Website application, so the Page detail Publish/Unpublish controls could not
be exercised against the reference.

No credentials, cookies, or tokens were accessed. No independent browser
backend was used. No tab was taken over, and the owned BrowserSkill session
was stopped after the blocker was established.
