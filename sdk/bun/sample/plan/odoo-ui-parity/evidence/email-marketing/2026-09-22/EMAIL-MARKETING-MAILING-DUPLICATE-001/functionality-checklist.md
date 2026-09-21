# Functionality checklist

| Case | Classification | Acceptance |
| --- | --- | --- |
| DUP-FUNC-001 | functional | Sent mailing exposes Duplicate; draft/queued/sending mailings do not. |
| DUP-DATA-001 | data | Submit creates one durable new mailing, copies subject/content/audience/sender, resets state to Draft, clears delivery dates/counters, and assigns a new ID/version. |
| DUP-WF-001 | workflow | Duplicate does not send or schedule mail and can be edited as a new draft. |
| DUP-SEC-001 | permission | `email_marketing.write` is required; read-only and unauthenticated calls do not create rows. |
| DUP-ERR-001 | security | Missing source, non-Sent source, invalid required values, and duplicate/concurrent submissions have stable rejection behavior without source mutation. |
| DUP-PERSIST-001 | regression | The new row survives reload/restart and existing mailing workflow tests remain green. |
| DUP-UI-001 | responsive | The detail action and duplicate form remain usable at 1440x900 and 390x844 with no horizontal overflow. |
| DUP-REF-001 | visual | Compare authenticated Odoo and Core3 captures when the installed Odoo action is available; otherwise retain the exact blocker and do not claim parity. |
