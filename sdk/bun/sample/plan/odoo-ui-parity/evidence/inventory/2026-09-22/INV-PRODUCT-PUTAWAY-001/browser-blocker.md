# BrowserSkill blocker

BrowserSkill daemon status was healthy for shared browser instance `245ea108`
(Chrome 145.0.0.0, extension 0.3.0, protocol 1.3). The user-owned tab list
contained the authenticated Odoo tab:

```text
TAB 1770662590  user  Acme Corporation  http://localhost:8069/odoo/contacts/9
```

Borrow attempt:

```text
BSK_AUTO_START=0 bsk tab borrow 1770662590 --session ivfy --timeout 20s
```

Exact result:

```text
error: timed out waiting for human confirmation
hint: report the blocked step; do not automatically repeat the request or switch browser tools
details: Timed out waiting for tab borrow confirmation
```

The session was stopped after the failed borrow. The tab was never owned, so no
Odoo page interaction or screenshot was performed. Desktop/mobile Odoo
captures, live action execution, and visual-parity sign-off are intentionally
omitted. No independent login or Playwright fallback was used.
