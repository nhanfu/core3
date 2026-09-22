# Browser verification and blockers

Date: 2026-09-22
BrowserSkill instance: `245ea108`
Requested action: authenticated Odoo question favorite toggle.

## BrowserSkill record

`bsk status --json` succeeded and showed a connected Chrome instance. The user
tab list identified the authenticated Odoo tab as `1770662590`. Borrowing it
returned:

`error: tab is borrowed by another session`

`details: tab_borrow: tab 1770662590 is already borrowed or being borrowed by session ftio`

The worker-owned session was stopped after the denial. No credentials, cookies,
tokens, or unrelated tab state were accessed. Because the existing tab could
not be borrowed, this worker could not truthfully click the live favorite
control or capture a new authenticated Odoo action state.

## Existing reference captures

The prior Forum captures remain truthful environment evidence:

- Desktop launcher: `/tmp/core3-odoo-parity/forum-config-20260921/odoo-live-menu-desktop.png`
- Mobile launcher: `/tmp/core3-odoo-parity/forum-config-20260921/odoo-live-menu-mobile.png`

They show no Website/Forum app. The prior direct `/forum` check returned Odoo
404 because `website_forum` is not installed in `core3_reference`. There are no
paired Odoo favorite-action captures and no Core3 favorite desktop/mobile
captures in this feature evidence. Visual parity is therefore blocked and not
claimed.
