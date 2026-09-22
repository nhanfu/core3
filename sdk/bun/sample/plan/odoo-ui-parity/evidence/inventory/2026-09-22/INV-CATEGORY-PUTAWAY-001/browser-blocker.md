# BrowserSkill blocker

BrowserSkill daemon status was healthy for shared browser instance
`245ea108` (Chrome 145.0.0.0, extension 0.3.0, protocol 1.3). The user-owned
tab list contained an Odoo tab at the requested service:

```text
TAB 1770663889  user  Odoo  http://localhost:8069/survey/results/feedback-form-1
```

Borrow attempt from session `qtlq`:

```text
BSK_AUTO_START=0 bsk tab borrow 1770663889 --session qtlq --timeout 20s
```

Exact result:

```text
error: tab is borrowed by another session
hint: return the tab from the borrowing session via `bsk tab return <tab-id> --session <id>` or stop that session
details: tab_borrow: tab 1770663889 is already borrowed or being borrowed by session jqig
```

The session list was empty after the attempt, so the owned BrowserSkill session
was already stopped. The tab was never owned by this work item. No Odoo action
interaction, Core3 authenticated interaction, desktop/mobile capture, or
visual-parity sign-off is claimed. No independent login or Playwright fallback
was used.
