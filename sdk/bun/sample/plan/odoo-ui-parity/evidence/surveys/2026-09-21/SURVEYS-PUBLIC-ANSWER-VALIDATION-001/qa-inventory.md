# QA inventory

- Public API controls: progress and submit for token-scoped survey answers.
- Validation states: invalid rating, unchanged durable response, valid
  progress, file-backed reopen, valid submit, and idempotent replay.
- Responsive states: authenticated Core3 Question 1 and Question 2 at
  1440x900 and 390x844.
- Focused result: 11 passed, 0 failed, 98 assertions.
- Scoped ESLint: pass.
- Audit: pass, 688 pages / 697 routes / 1,282 datasources.
- `git diff --check`: pass.
- Full repository regression: not run.
- Odoo limitation: route reachable, but waiting state prevented an invalid
  answer mutation comparison.
