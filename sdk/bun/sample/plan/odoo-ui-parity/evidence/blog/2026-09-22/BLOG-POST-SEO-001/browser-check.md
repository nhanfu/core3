# BrowserSkill verification

BrowserSkill daemon/extension: connected instance `245ea108`, protocol 1.3.
The existing Odoo user tabs were listed, but the authenticated tab could not be
borrowed before the checkpoint; no credentials, cookies, or tokens were read.

## Odoo reference

Using a task-created BrowserSkill tab against
`http://localhost:8069/blog?db=core3_reference`:

- desktop viewport: 1916x833, Odoo Error 404;
- mobile emulation: 390x844, Odoo Error 404;
- the authenticated launcher had no Website/Blog menu, confirming the local
  `website_blog` addon is absent from `core3_reference`.

Captures: `odoo-desktop-404.png` and `odoo-mobile-404.png`.

## Core3 route

A scoped Core3 server loaded at `http://127.0.0.1:4311`, but the task-created
tab redirected `/blog/blog-posts` to Core3 sign-in. The authorized BrowserSkill
help request was cancelled at the user checkpoint; no credential was entered or
exposed and no authenticated Blog capture was made. `core3-sign-in.png` records
the unauthenticated redirect only.

Result: authenticated desktop/mobile Odoo/Core3 visual comparison is blocked;
no visual-parity claim is made.
