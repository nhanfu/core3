# BrowserSkill check

BrowserSkill was used as required with shared browser instance `245ea108`.

1. `BSK_AUTO_START=0 bsk status --json` succeeded: daemon `0.3.0`, protocol
   `1.3`, Chrome extension `0.3.0`, instance `245ea108`.
2. `bsk session start --json --browser 245ea108 --no-focus` created task
   session `igzh`.
3. `bsk tab list --scope user --session igzh` identified authenticated Odoo
   tab `1770662590`, titled `Acme Corporation`, at the Odoo contacts route.
4. The required borrow was issued once:
   `BSK_AUTO_START=0 bsk tab borrow 1770662590 --session igzh --timeout 120s`.
5. Exact result: `error: tab is borrowed by another session`; the daemon
   identified owner session `ebbh`.
6. The task session was not navigated, no independent login was attempted,
   and no credentials/cookies/tokens/passwords were printed. A subsequent
   `bsk session list --json` reported no registered sessions after cleanup.

The owner session was not stopped or hijacked. This is an environment
ownership blocker, not a product or visual result.
