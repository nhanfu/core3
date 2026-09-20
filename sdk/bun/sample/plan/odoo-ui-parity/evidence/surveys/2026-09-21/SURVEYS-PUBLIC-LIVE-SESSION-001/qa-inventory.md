# QA inventory

- Public controls: session-code entry, name join, refresh, answer selection,
  answer submission, and reload restoration.
- Functional checks: public route binding, existing YAML page/API split,
  join/answer token guards, duplicate-answer replay, and file-backed restart.
- Focused result: 7 passed, 0 failed, 64 assertions.
- Scoped ESLint: pass.
- `bun run audit`: pass, 688 pages / 697 routes / 1,282 datasources.
- `git diff --check`: pass.
- Full repository regression: not run for this bounded finalization.
- Odoo comparison: blocked by connection refusal at `127.0.0.1:8072`.
