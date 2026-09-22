# BrowserSkill check

Browser instance: `245ea108`
Reference URL: `http://localhost:8069`
Required tab: authenticated Odoo tab `1770662590` (`Acme Corporation`)

The daemon reported browser instance `245ea108` connected and protocol/extension
version `1.3`. A new no-focus BrowserSkill session `vxou` was started. The user
tab list showed tab `1770662590`, but borrowing it returned:

```text
error: tab is borrowed by another session
hint: return the tab from the borrowing session via `bsk tab return <tab-id> --session <id>` or stop that session
details: tab_borrow: tab 1770662590 is already borrowed or being borrowed by session mczn
```

The owned session `vxou` was stopped immediately after the denial. No Odoo
navigation, action inspection, screenshot, independent login, cookie/token
access, or alternate browser backend was used. Therefore there are no truthful
desktop/mobile captures for this feature and no visual-parity claim.
