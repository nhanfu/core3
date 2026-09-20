# QA inventory

| Claim/control | Functional check | Visual evidence |
| --- | --- | --- |
| Authenticated Surveys catalog remains available | Admin login, `/surveys`, no page/request failures | `core3-desktop-admin.png`, `core3-mobile-admin.png` |
| Public email identity capture | Landing → start → email question, API returns `save_as_email` | `core3-browser-results.json`, identity captures |
| Public nickname identity capture | Next → nickname question, API returns `save_as_nickname` | `core3-browser-results.json`, identity captures |
| Responsive public flow | 1440x900 and 390x844, no horizontal overflow | desktop/mobile identity captures |
| Token boundary | Integration test rejects wrong answer token with 404 | focused test output |
| Restart/idempotency | File-backed reopen retains identity and concurrent submit creates one row | focused test output |
| Paired Odoo route | Authenticated reference probe attempted | `odoo-blocker.json` and blocker captures |

Exploratory cases included: wrong-token progress and two concurrent submits with
conflicting explicit identity values; the configured question-derived identity
remains authoritative.
