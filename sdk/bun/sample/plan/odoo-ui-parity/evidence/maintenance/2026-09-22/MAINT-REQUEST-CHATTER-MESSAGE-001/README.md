# MAINT-REQUEST-CHATTER-MESSAGE-001

## Source-backed slice

Odoo 19 `maintenance.request` inherits `mail.thread.cc` and
`mail.activity.mixin`, and `addons/maintenance/views/maintenance_views.xml`
renders `<chatter/>` on the request form. The source-backed gap was that the
Core3 request detail exposed only the internal-note composer. This slice adds
the public `Send message` composer and durable timeline event while preserving
the existing note and activity contracts.

## Core3 implementation

- Page/API binding: `services/maintenance/pages/request-detail.yaml` and
  `services/maintenance/api/request-detail.yaml`.
- Durable deterministic seed: migration
  `20260922233000-011-maintenance-request-chatter-message.yaml`.
- Guards: authenticated actor, existing active request, row-version match, and
  1–4000 character trimmed content; insertion and parent version update are
  atomic.
- Tests: `test/maintenance_request_chatter_message.integration.test.ts`.

## Verification

- Focused test: 4 tests, 8 top-level test cases plus repository checks.
- BrowserSkill: explicit borrow of the shared authenticated Odoo tab was
  requested once, but confirmation timed out. The tab was not taken over and
  no independent login or Playwright session was used.
- No authenticated Core3/Odoo desktop/mobile visual-parity claim is made for
  this slice.

## Remaining gaps

Followers, attachments, public mail delivery, provider/notification behavior,
and whole-module Maintenance parity remain outside this bounded slice.
