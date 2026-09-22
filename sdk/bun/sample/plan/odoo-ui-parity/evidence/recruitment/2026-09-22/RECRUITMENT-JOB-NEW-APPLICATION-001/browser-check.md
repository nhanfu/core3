# BrowserSkill blocker and truthful evidence

BrowserSkill status was checked with `BSK_AUTO_START=0 bsk status --json`.
Browser instance `245ea108` was connected (`chrome`, extension `0.3.0`,
protocol `1.3`). A BrowserSkill session was started and the user tab list
showed the existing authenticated Odoo tab without reading credentials:

```text
TAB 1770662590  user  Acme Corporation  http://localhost:8069/odoo/contacts/9
```

The required borrow command was issued once:

```text
BSK_AUTO_START=0 bsk tab borrow 1770662590 --session ftio
```

It produced no successful borrow result while waiting for the configured
confirmation. A later state check returned:

```text
{"code":"not_found","message":"session not registered or already stopped","hint":"the session, tab, or browser may have stopped; run `bsk session list` / `bsk browsers` to see current state","exit_code":1}
```

Because the tab was never borrowed, no Odoo navigation, action inspection,
screenshot, desktop/mobile capture, or visual comparison was performed. No
independent login, Playwright session, credential extraction, or alternate
browser was used. This is an environment/borrow-confirmation blocker, not
evidence that the Odoo action is missing. No visual-parity claim is made.
