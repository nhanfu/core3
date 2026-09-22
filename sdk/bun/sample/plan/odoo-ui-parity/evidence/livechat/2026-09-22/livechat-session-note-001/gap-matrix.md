# Gap matrix

| Gap | Impact | Follow-up |
| --- | --- | --- |
| Odoo reference public Live Chat route returns 404 | No authenticated Live Chat visual comparison can be made | Re-run after `im_livechat` is available in `core3_reference` |
| Authenticated user tabs were occupied by other BrowserSkill sessions; available-tab borrow timed out | No authenticated desktop/mobile capture | Borrow a free authenticated tab and return it after capture |
| Core3 generic form action saves explicitly rather than on textarea blur | Interaction parity is bounded, not complete | Add declarative blur-submit support to the shared form renderer |
| Core3 uses text storage for Odoo HTML note semantics | Basic markup persists, but sanitization is not independently reproduced | Add shared safe-HTML field contract before claiming full parity |
