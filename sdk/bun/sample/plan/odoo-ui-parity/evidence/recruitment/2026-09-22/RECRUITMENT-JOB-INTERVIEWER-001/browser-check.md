# BrowserSkill check

BrowserSkill was required and used with shared browser instance `245ea108`.

Commands and truthful result:

```text
bsk session start --json --browser 245ea108 --no-focus
session_id: rpmb
bsk tab list --scope user --session rpmb
TAB 1770662590  user  ...  Acme Corporation  http://localhost:8069/odoo/contacts/9
bsk tab borrow 1770662590 --session rpmb
error: tab is borrowed by another session
hint: return the tab from the borrowing session via bsk tab return <tab-id> --session <id> or stop that session
details: tab_borrow: tab 1770662590 is already borrowed or being borrowed by session cqvt
bsk session stop rpmb
stopped rpmb
```

The tab was not borrowed, so no Odoo action inspection, desktop capture, or
mobile capture was possible. No independent login, Playwright session,
credential access, alternate browser, or database reset was used. There are no
browser screenshot artifacts for this feature and no Odoo visual-parity claim.
