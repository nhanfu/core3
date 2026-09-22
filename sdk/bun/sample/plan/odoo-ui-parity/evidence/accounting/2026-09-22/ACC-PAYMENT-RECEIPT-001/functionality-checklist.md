# Functionality checklist

| Case | Class | Expected | Result |
| --- | --- | --- | --- |
| PR-01 | functional | Payment detail exposes `Send receipt by email` | covered by page/API contract test |
| PR-02 | functional | Valid recipient, subject, and body create one queued receipt | pass in focused integration test |
| PR-03 | data | Receipt recipient, status, attachment filename, counter, and timestamp persist | pass in focused integration test |
| PR-04 | validation | Invalid email or empty content is rejected without a receipt row | pass in focused integration test |
| PR-05 | workflow | Draft payments cannot send; processed payments can send | guarded by server mutation; processed path pass |
| PR-06 | security | Action declares `accounting.write`; page read remains `accounting.read` | pass by contract inspection |
| PR-07 | concurrency | Stale payment row version is rejected atomically | pass in focused integration test |
| PR-08 | persistence | Queued receipt and counter survive DuckDB close/reopen and migration replay | pass in focused integration test |
| PR-09 | responsive | Odoo/Core3 desktop and mobile composer comparison | blocked by shared-tab borrow timeout; no claim |
| PR-10 | integration | SMTP delivery, mail queue worker, and PDF attachment bytes | explicitly deferred boundary |
