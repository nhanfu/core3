# Functionality checklist

| Case | Classification | Result |
| --- | --- | --- |
| AB-AUTO-WINNER-FUNC-001 | functional | **PASS** — source action maps to the existing mailing detail page/API join. |
| AB-AUTO-WINNER-DATA-001 | data | **PASS** — highest configured ratio wins and ties are deterministic by ID. |
| AB-AUTO-WINNER-WORKFLOW-001 | workflow | **PASS** — queued 100% copy is created and the A/B group completes. |
| AB-AUTO-WINNER-SEC-001 | permission/security | **PASS** — write permission, missing, stale, manual, completed, and duplicate guards are covered. |
| AB-AUTO-WINNER-UI-001 | responsive | **BLOCKED** — no authenticated browser capture because the required tab was owned by another session. |
| AB-AUTO-WINNER-REF-001 | visual | **BLOCKED** — installed Odoo action was not reached. |
