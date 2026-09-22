# BrowserSkill check

BrowserSkill was used as required with shared browser instance `245ea108`.

1. `BSK_AUTO_START=0 bsk status --json` succeeded with daemon/protocol `0.3.0` / `1.3` and connected Chrome extension `0.3.0`.
2. `bsk session start --json --browser 245ea108 --no-focus` created task session `nzkf`.
3. `bsk tab list --scope user --session nzkf` identified authenticated Odoo tab `1770662590` at `http://localhost:8069/odoo/contacts/9`.
4. The required borrow was issued once: `bsk tab borrow 1770662590 --session nzkf --timeout 120s`.
5. Exact result: `error: tab is borrowed by another session`; the daemon identified owner session `fngy`.
6. The task session was stopped. The tab was not navigated or hijacked, and no credentials, cookies, tokens, or passwords were printed.

This is an environment ownership blocker, not a product or visual result.
