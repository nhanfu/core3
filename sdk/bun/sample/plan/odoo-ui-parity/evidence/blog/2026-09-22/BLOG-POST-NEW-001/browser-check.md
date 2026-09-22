# BrowserSkill check

Date: 2026-09-22

BrowserSkill was started with browser instance `245ea108`. The authenticated
Odoo user tab was listed as `Acme Corporation`, but borrowing it failed with
the exact BrowserSkill result:

```text
error: tab is borrowed by another session
hint: return the tab from the borrowing session via bsk tab return or stop that session
details: tab is already borrowed or being borrowed by session wabp
```

The tab owner was not interrupted. No independent Playwright/browser session
or login was used.

Desktop and mobile Odoo action captures were not created because BrowserSkill
does not permit reading or screenshotting a user-owned tab without borrowing
it. Consequently this feature has no authenticated desktop/mobile visual
parity claim. The source-backed XML comparison is recorded in
`source-comparison.md` and the functional contract evidence is recorded in
`test-results.md`.
