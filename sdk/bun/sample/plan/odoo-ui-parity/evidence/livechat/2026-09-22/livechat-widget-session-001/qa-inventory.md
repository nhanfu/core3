# QA inventory

| Check | Result |
| --- | --- |
| Odoo source and CORS route comparison | covered |
| Page/API `page.id` separation | covered |
| Public permission and token ownership | covered |
| Operator-backed durable bootstrap/resume | covered |
| Channel, identity, temporary-mode, and closed-state guards | covered |
| Idempotent migration and file-backed restart | covered |
| Focused tests and paired visitor regression | pass: 6 tests, 44 assertions |
| Odoo desktop/mobile widget UI | blocked: `/im_livechat/support/1` is authenticated Error 404 |
| Core3 desktop/mobile widget UI | blocked: local Vite/backend failure; no visual sign-off |
| Repository-wide discovery audit | blocked: unrelated dirty-worktree Blog YAML parse error |

Odoo blocker captures are outside Git:

- `/tmp/odoo-livechat-get-session-blocker-desktop-20260922-final.png`
- `/tmp/odoo-livechat-get-session-blocker-mobile-20260922-final.png`

Core3 desktop blocker capture is outside Git:

- `/tmp/core3-livechat-widget-session-blocker-desktop-20260922.png`

The mobile Core3 navigation ended with `ERR_CONNECTION_REFUSED`, so no mobile Core3 image is claimed.
