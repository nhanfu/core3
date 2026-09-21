# CRM-LEAD-FOLLOWERS-001 verification

Status: bounded implementation; conditional browser evidence.

## Source comparison

- Odoo 19 `crm.lead` inherits `mail.thread` and renders the generic chatter in
  `addons/crm/views/crm_lead_views.xml`.
- `addons/mail/models/mail_thread.py` exposes `message_follower_ids` and
  `message_partner_ids`; `addons/mail/models/mail_followers.py` enforces the
  unique `(res_model, res_id, partner_id)` subscription.
- Core3 uses `services/crm/pages/lead-detail.yaml` for the follower panel and
  `services/crm/api/lead-detail.yaml` for the datasource and mutations.

## Implementation

The auth validation guard no longer merges the follower user record into the
mutation parameters, which previously overwrote the lead `id`. The add
mutation writes the `crm.followers.add` audit record before the idempotent
follower insert. Both steps run in one YAML mutation transaction, so duplicate
subscriptions do not create duplicate audit rows while successful adds remain
restart-visible.

## Verification

- `bun test test/crm_lead_followers.integration.test.ts` — 2 tests passed,
  19 assertions.
- Related regression run:
  `bun test test/crm_lead_followers.integration.test.ts test/crm.integration.test.ts test/crm_lead_duplicates.integration.test.ts test/crm_team_overdue_opportunities.integration.test.ts`
  — 51 passed, 1 pre-existing AI-catalog failure, 276 assertions. The failure
  is the known missing allowlist entries for the four Lead Mining Requests
  operations and is outside this CRM-only change.
- `bun run audit` — passed, 797 pages, 806 routes, 1,644 datasources.
- `bunx eslint sample/test/crm_lead_followers.integration.test.ts` — passed.
- `bun run frontend:build` — passed.
- CRM-scoped `git diff --check` — passed.
- Browser instance `245ea108`: authenticated Odoo Pipeline route observed at
  `http://localhost:8069/odoo/crm`; no lead-detail capture was produced.
- Core3 visual verification: blocked before render by unrelated Events page
  discovery errors (`upload_event_badge_background`, `FormSection`). No visual
  parity claim is made.
