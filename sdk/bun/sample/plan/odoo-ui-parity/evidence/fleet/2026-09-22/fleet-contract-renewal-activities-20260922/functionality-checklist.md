# Functionality checklist

| Acceptance item | Result |
| --- | --- |
| Durable activity table and fixed renewal fixture | PASS; idempotent migration `20260922100000-037-fleet-contract-activities.yaml` |
| Page YAML remains presentation-only and API joins by `page.id` | PASS |
| Activity stream is read-scoped to the contract and current company | PASS |
| Schedule renewal activity with derived expiration deadline | PASS |
| Require actor, active contract, non-empty summary, and current row version | PASS |
| Complete planned activity with actor and activity row version | PASS |
| Reject missing, wrong-company, repeated/stale, and invalid requests | PASS at mutation contract level |
| File-backed close/reopen and migration replay | PASS |
| Focused/affected/full Fleet regression tests | PASS |
| Authenticated Odoo desktop/mobile comparison | BLOCKED; Fleet absent from reference app launcher |
| Authenticated Core3 desktop/mobile workflow | BLOCKED; protected QA sign-in was not completed |
