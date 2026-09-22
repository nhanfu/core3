# BrowserSkill check

Required browser: shared BrowserSkill Chrome instance `245ea108`.

Commands and truthful outcome:

```text
BSK_AUTO_START=0 bsk status --json
browser instance 245ea108 connected; existing session ioxf present

BSK_AUTO_START=0 bsk session start --json --browser 245ea108 --no-focus
session quzf

BSK_AUTO_START=0 bsk tab list --scope user --session quzf
authenticated Odoo tab listed as tab 1770662590

BSK_AUTO_START=0 bsk tab borrow 1770662590 --session quzf --timeout 20s
error: tab is borrowed by another session
hint: return the tab from the borrowing session via bsk tab return <tab-id> --session <id> or stop that session

BSK_AUTO_START=0 bsk session stop quzf
stopped quzf
```

The tab was not borrowed by this worker, no page navigation or action
inspection was performed, and no screenshot was captured from an unowned tab.
There is no authenticated Odoo desktop/mobile evidence for this batch and no
visual-parity claim.
