# BrowserSkill blocker

Date: 2026-09-22
Browser instance: `245ea108`
Odoo reference: `http://localhost:8069`, database `core3_reference`

The BrowserSkill daemon and shared Chrome instance were ready. The user tab
list showed the authenticated Odoo tab `1770662590` at
`http://localhost:8069/odoo/contacts/9`. Borrowing it from the owned session
was denied by BrowserSkill:

```text
error: tab is borrowed by another session
hint: return the tab from the borrowing session via `bsk tab return <tab-id> --session <id>` or stop that session
details: tab_borrow: tab 1770662590 is already borrowed or being borrowed by session wabp
```

The owned session `uxby` was stopped after the denial. No independent browser,
login, credential, cookie, token, or alternate automation backend was used.
No Odoo desktop/mobile screenshots were captured, and no visual-parity claim
is made for this feature.
