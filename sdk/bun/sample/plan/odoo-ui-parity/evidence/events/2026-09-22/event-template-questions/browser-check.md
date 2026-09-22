# Browser check

## Required shared-browser setup

- BrowserSkill instance: `245ea108`
- Existing authenticated Odoo tab: `1770662590`
- Database/session: the team's existing authenticated Odoo service/session;
  credentials were not accessed or printed.

## Result

`bsk status --json` reported a healthy BrowserSkill daemon, connected Chrome
instance `245ea108`, and no version skew. The required
`bsk tab borrow 1770662590 --session vtjq --timeout 120s` request remained
pending for the extension's required human confirmation and timed out. The tab
remained user-scoped. Session `vtjq` was stopped afterward.

No independent login, Playwright session, alternate browser, credential access,
or Odoo database reset was used. No Odoo desktop/mobile captures were produced
for this feature. Core3 desktop/mobile captures were therefore not attempted
as a substitute. Visual comparison is blocked and this feature makes no
visual-parity claim.
