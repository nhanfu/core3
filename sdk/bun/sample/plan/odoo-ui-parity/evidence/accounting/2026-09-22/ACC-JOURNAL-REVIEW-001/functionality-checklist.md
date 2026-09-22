# Functionality checklist

| ID | Area | Acceptance case | Result |
| --- | --- | --- | --- |
| ACC-JOURNAL-REVIEW-FUNC-001 | functional | Posted Journal Entry exposes Reviewed from the list row menu/detail and marks it reviewed | pass in contract/mutation test |
| ACC-JOURNAL-REVIEW-GUARD-002 | workflow | Draft, missing, duplicate, and stale rows reject without partial writes | pass |
| ACC-JOURNAL-REVIEW-PERM-003 | permission | List/detail action requires `accounting.write`; reads remain `accounting.read` | pass in contract |
| ACC-JOURNAL-REVIEW-DATA-004 | persistence | Checked state and row version survive DuckDB close/reopen and migration replay | pass |
| ACC-JOURNAL-REVIEW-UI-005 | visual/responsive | Authenticated Odoo/Core3 desktop and mobile action comparison | blocked by BrowserSkill tab ownership; no visual claim |

Out of scope: Odoo multi-record selection, reviewer metadata, an Unreview
action, and cryptographic hash integrity.
