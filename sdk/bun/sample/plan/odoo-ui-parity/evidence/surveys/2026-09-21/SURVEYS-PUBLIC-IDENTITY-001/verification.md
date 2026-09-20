# Verification

- `bun test test/surveys_public_identity.integration.test.ts` — 2 passed,
  19 assertions.
- `bun test test/surveys_public*.integration.test.ts test/surveys.integration.test.ts`
  — 71 passed, 638 assertions.
- `bun test test/surveys*.integration.test.ts` — the completed portion passed;
  the four existing migration rollback tests reproduced the DuckDB dependency
  blocker: `Cannot alter entry "survey_questions" because there are entries
  that depend on it.` The long-running process was stopped after that bounded
  reproduction; no full-repository pass is claimed.
- Authenticated Core3 desktop/mobile browser probes passed with API 200,
  identity flags present, no request/page failures, and no horizontal overflow.
- Odoo desktop/mobile probes reached `127.0.0.1:8069` but redirected to
  `/web/login?redirect=%2Fodoo%2Fsurveys%3F`; `127.0.0.1:8072` refused the
  connection. No Odoo identity fixture was available, so paired sign-off is
  blocked.
