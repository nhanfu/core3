# Website Redirects manager browser check

- Date: 2026-09-22
- Target: `http://localhost:8069/web?db=core3_reference`
- BrowserSkill session: `anff` (stopped)
- Result: blocked for Website UI evidence.

BrowserSkill listed no borrowable authenticated Odoo Website tab. A task-created
navigation reached `http://localhost:8069/odoo?db=core3_reference` and showed the
authenticated Discuss shell, not the Website application or Redirects manager.
No credentials were requested or exposed, no independent browser backend was
used, and the BrowserSkill session was stopped immediately after observation.
