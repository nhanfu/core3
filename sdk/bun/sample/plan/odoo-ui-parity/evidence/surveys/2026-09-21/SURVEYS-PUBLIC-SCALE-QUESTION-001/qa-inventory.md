# QA inventory

| Probe | State/claim | Intended check | Evidence |
| --- | --- | --- | --- |
| API contract | Paired `surveys` page/API with `surveys.public` progress/submit | Confirm `page.id`, permissions, and Scale option range are declarative | Focused integration test and source comparison |
| Invalid scale | Out-of-range value `11` | 422 before `answer_data` mutation | Focused integration test |
| Restart/idempotency | Valid scale `8` → file-backed reopen → concurrent submit | Preserve value and converge to one submitted response | Focused integration test |
| Token boundary | Wrong answer token | 404 without disclosure or mutation | Focused integration test |
| Core3 desktop/mobile | Authenticated 1440x900 and 390x844 | Login/me, public API/page, overflow, failed requests | Browser JSON and screenshots |
| Odoo desktop/mobile | Public certification token | Compare rendered state and record exact installed/reference blocker | Odoo JSON and screenshots |

Exploratory checks include an out-of-range scale value and a concurrent
same-key submit after restart. Visual claims remain conditional if the shared
runtime or Odoo reference cannot expose the authenticated public route.
