# BrowserSkill check

BrowserSkill daemon and extension were healthy on shared browser instance
`245ea108`. No independent browser or login was used, and no credentials were
printed or stored.

The authenticated user tab was listed as `1770662590` at
`http://localhost:8069/odoo/contacts/9`. Borrowing it from session `elik`
returned:

`tab_borrow: tab 1770662590 is already borrowed or being borrowed by session mczn`

I did not inspect, navigate, or return the other worker's tab. In a
task-created tab, `/forum` rendered Odoo's `Error 404 We couldn't find the page
you're looking for!` page. This is consistent with the source/reference
blocker that `website_forum` is not installed in `core3_reference`; the Forum
action is unavailable for live visual comparison.

Truthful blocker captures:

- Desktop 1440x900: `/tmp/core3-odoo-parity/forum-downvote-odoo-desktop-1440x900-blocker.png`
- Mobile 390x844: `/tmp/core3-odoo-parity/forum-downvote-odoo-mobile-390x844-blocker.png`

No Odoo downvote control capture, Core3 paired capture, or visual-parity claim
is made. The worker-owned BrowserSkill session was stopped after the check.
