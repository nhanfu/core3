# BrowserSkill check

BrowserSkill daemon status was healthy for Chrome instance `245ea108`.

The existing authenticated Odoo tab at `/odoo/contacts/9` was listed before
borrowing, but borrow was denied because it was already borrowed by team
session `wqul`. It was not hijacked and no credentials, cookies, or tokens were
read.

One task-created tab in the same BrowserSkill Chrome instance was used without
login or credential access:

- Desktop observation: `/blog` returned Odoo Error 404 at semantic viewport
  1916x833. Capture: `odoo-blog-desktop-blocker.png`.
- Mobile observation: BrowserSkill emulation reported 390x844 with iPhone 14
  settings; `/blog` returned the same Odoo Error 404. Capture:
  `odoo-blog-mobile-blocker.png`.
- The task session was stopped after capture. No borrowed tab was left open by
  this worker.

This is a runtime/install blocker, not visual-parity evidence. The authenticated
`core3_reference` database has no installed Website/Blog route, so no live
Odoo Blog action could be clicked and no paired Core3/Odoo comparison is
claimed. A separate Core3 dev probe reached HTTP 200 on `/api/modules`, but the
same task-created browser tab had no Core3 auth state: `/api/pages/dashboard`
returned HTTP 401 and `/blog-posts` rendered no authenticated page. The dev
process was stopped after the probe; no independent login was attempted.
