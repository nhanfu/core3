# Verification

## BrowserSkill live-reference result

BrowserSkill status confirmed shared Chrome instance `245ea108` connected with
extension protocol 1.3. A new session `bsix` was started, but the authenticated
Odoo tab `1770662590` (`Acme Corporation`,
`http://localhost:8069/odoo/contacts/9`) was already borrowed by another active
session `ftio`. The borrow command returned:

```text
tab is borrowed by another session
details: tab_borrow: tab 1770662590 is already borrowed or being borrowed by session ftio
```

The tab was not used, the other session was not interrupted, and no independent
login or Playwright session was substituted. Because the authenticated tab
could not be borrowed, no truthful Odoo Live Chat action inspection or
desktop/mobile capture was possible in this bounded run. No visual-parity claim
is made. No new screenshot was produced; the blocker is the borrow denial,
not a screenshot of an unrelated tab.

## Core3 result

The source/API contract and durable mutation are covered by the focused test.
An authenticated Core3 desktop/mobile capture was not claimed because the
shared local runtime was not started in this run and browser access was already
occupied by concurrent sessions. The queue boundary is explicit: Core3 records
`Queued` delivery state, but no outbound email transport is configured.

BrowserSkill session cleanup: session `bsix` was stopped after the blocked
borrow attempt. No user tab was borrowed, so no tab return was required.
