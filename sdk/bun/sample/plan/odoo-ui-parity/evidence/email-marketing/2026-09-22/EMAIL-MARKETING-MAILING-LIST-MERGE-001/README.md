# Email Marketing Mailing List Merge — bounded evidence

Date: 2026-09-22

Stable action: Odoo `mailing_list_merge_action`, model `mailing.list.merge`,
source revision `659759969d535d286b656c96b675e4612b925ddd` (`65975996`).

Source files inspected:

- `/home/nhanjs/projects/odoo/addons/mass_mailing/wizard/mailing_list_merge_views.xml`
- `/home/nhanjs/projects/odoo/addons/mass_mailing/wizard/mailing_list_merge.py`
- `/home/nhanjs/projects/odoo/addons/mass_mailing/models/mailing_list.py`
- `/home/nhanjs/projects/odoo/addons/mass_mailing/tests/test_mailing_list.py`

Core3 implementation:

- `sdk/bun/sample/services/email-marketing/pages/lists.yaml`
- `sdk/bun/sample/services/email-marketing/api/lists.yaml`
- `sdk/bun/sample/test/email_marketing_mailing_list_merge.integration.test.ts`

Assertions and gates:

- Focused: 4 passed, 0 failed, 23 assertions.
- Full Email Marketing regression: 59 passed, 0 failed, 535 assertions across
  17 integration files.
- Audit: 808 pages, 817 routes, 1,675 datasources.
- Email Marketing CSS build: passed.
- Frontend Vite build: passed.
- `git diff --check`: passed.

The focused contract proves the page/API `page.id` join, Odoo wizard labels
and action metadata, existing and new destinations, email deduplication,
opt-out and blacklist exclusion, optional source archiving, restart
persistence, duplicate-safe replay, empty/invalid/duplicate/stale/missing and
company-scope guards, and transaction rollback without partial writes.

## Browser evidence and exact blocker

BrowserSkill daemon status was successful for shared browser instance
`245ea108` (Chrome, extension connected). The authenticated user tab list
showed tab `1770662590`, title `Acme Corporation`, URL
`http://localhost:8069/odoo/contacts/9`. The required borrow attempt was:

```text
BSK_AUTO_START=0 bsk tab borrow 1770662590 --session yciq
```

It remained pending until the configured confirmation window ended; a later
tab list still showed the tab as `user` scope. The tab was not navigated and no
credentials, cookies, tokens, or passwords were printed. No Odoo Email
Marketing menu/action was inspected, and no Odoo or Core3 desktop/mobile
screenshots were captured. This is an environment confirmation blocker, not
visual-parity evidence. Cleanup verification showed `bsk session list --json`
as `[]` and browser instance `245ea108` with zero sessions; the explicit stop
call reported that the session was already unregistered, and no borrowed tab
remained.

No image files are committed in this evidence bundle.
