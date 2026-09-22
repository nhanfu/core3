# BrowserSkill comparison

Date: 2026-09-22

BrowserSkill instance `245ea108` was healthy and listed the user-owned
authenticated Odoo tab `1770662590` at `http://localhost:8069/odoo/contacts/9`.
The tab borrow request was issued from sessions `mczn` and, after the first
request closed, `eaja`; neither request granted ownership before its
confirmation timeout. The tab was not read, navigated, or screenshot, and no
credentials, cookies, or tokens were accessed.

Because BrowserSkill ownership was unavailable, the live Odoo Blog Post form
and action could not be inspected at 1440x900 or 390x844. No independent login,
Playwright session, or alternate browser backend was used. No desktop/mobile
captures were produced, and this slice makes no visual-parity claim.

Cleanup: session `eaja` was explicitly stopped after the failed borrow; the
user tab was not left borrowed.
