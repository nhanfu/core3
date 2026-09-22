# BrowserSkill blocker

- Browser instance: `245ea108`
- Daemon: healthy, BrowserSkill 0.3.0 / protocol 1.3.
- Existing signed-in Odoo tab: `1770662590`.
- Session: `rxce`.
- Operation: `bsk tab borrow 1770662590 --session rxce`.
- Result: borrow confirmation never completed; the command remained pending
  until the session was stopped. No navigation or action observation occurred.
- Cleanup: `bsk session stop rxce` was run. No unborrowed tab, independent
  login, cookie, token, or credential was used.

Because the tab could not be borrowed, this feature has no truthful Odoo
desktop/mobile action capture. Current-wave shared-profile blocker captures
from the adjacent `MANUFACTURING-WCLATE-001` feature are not claimed as
captures of Work Orders Planning.
