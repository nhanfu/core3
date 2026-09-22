# Verification

## Odoo reference

The required authenticated Odoo Campaigns action could not be reached. The
authenticated tab `1770662590` on BrowserSkill instance `245ea108` was already
borrowed by active session `lexx`; the task session received the exact error
`tab is borrowed by another session`. The tab was not navigated.

Desktop and mobile Odoo captures: **none**. No installed-reference visual
parity claim is made.

## Core3 browser verification

No independent browser or login was substituted after the required tab borrow
failed. Core3 desktop/mobile captures are therefore also **none** for this
slice. Contract, persistence, and shared-renderer compatibility are covered by
the focused integration suite and audit/build gates above; they are not a visual
sign-off.

## Cleanup

The task BrowserSkill session `hwtf` was stopped successfully. No borrowed tab
was held by this task and no credentials were printed or committed.
