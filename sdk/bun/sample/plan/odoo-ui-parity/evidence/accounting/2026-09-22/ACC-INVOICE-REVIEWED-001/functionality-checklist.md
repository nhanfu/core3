# Functionality checklist

| ID | Area | Acceptance case | Result |
| --- | --- | --- | --- |
| ACC-REVIEW-FUNC-001 | functional | Posted unchecked invoice exposes Reviewed and transitions to checked | pass |
| ACC-REVIEW-GUARD-002 | workflow | Missing, stale, non-posted, and already-reviewed rows reject without partial writes | pass |
| ACC-REVIEW-PERM-003 | permission | Header action declares `accounting.write` | pass in contract |
| ACC-REVIEW-DATA-004 | persistence | Checked state and row version survive DuckDB close/reopen and migration replay | pass |
| ACC-REVIEW-UI-005 | visual/responsive | Authenticated Odoo/Core3 desktop and mobile action comparison | blocked by BrowserSkill tab borrow; no visual claim |
