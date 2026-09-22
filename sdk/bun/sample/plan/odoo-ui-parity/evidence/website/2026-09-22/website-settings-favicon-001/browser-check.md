# BrowserSkill comparison record

BrowserSkill daemon status was healthy on browser instance `245ea108` with the
existing authenticated Odoo user tab listed as tab `1770662590` (`Acme
Corporation`, `http://localhost:8069/odoo/contacts/9`). A new session attempted
to borrow that tab with:

```text
bsk tab borrow 1770662590 --session prea --timeout 20s --json
```

The exact response was:

```text
permission_denied: tab_borrow: tab 1770662590 is already borrowed or being
borrowed by session xigt
hint: return the tab from the borrowing session via
`bsk tab return <tab-id> --session <id>` or stop that session
reason: borrow_conflict
```

The tab was not taken over or stopped. Because the authenticated tab could not
be owned, no Odoo favicon settings screenshot was captured and no independent
login or Playwright session was used. Existing diagnostic captures from the
same Odoo reference (`../website-themes-001/odoo-no-website-desktop.png` and
`odoo-no-website-mobile.png`) show the previously recorded missing Website app,
but are not favicon-screen captures. No visual-parity claim is made.

BrowserSkill cleanup: no tab was borrowed by this session, so there was no tab
to return; this worker did not stop or alter session `xigt`.
