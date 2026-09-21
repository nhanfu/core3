# Functionality checklist

| Case | Result |
| --- | --- |
| Vehicle detail keeps page/API YAML separate and joined by `page.id` | PASS |
| Read attachments by vehicle and current company | PASS |
| Manager/Fleet write permission controls upload and removal | PASS in API contract/tests |
| Upload records file metadata and storage key durably | PASS in API contract/tests |
| Download is authenticated and company-scoped | PASS in storage contract |
| Remove is atomic and soft-deactivates the attachment | PASS in API contract/tests |
| Actor, missing vehicle, wrong company, invalid file, duplicate file, and stale row guards | PASS in focused tests |
| File-backed restart and migration replay retain attachment metadata | PASS in focused tests |
| Live Odoo desktop/mobile comparison | BLOCKED; Fleet absent from `core3_reference` |
| Authenticated Core3 desktop/mobile workflow | BLOCKED if protected QA sign-in/runtime remains unavailable |
