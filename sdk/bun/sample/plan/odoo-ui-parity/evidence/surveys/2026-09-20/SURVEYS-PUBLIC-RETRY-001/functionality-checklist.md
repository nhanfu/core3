# Functionality checklist

- [x] Submitted source response is required.
- [x] Survey token and answer token are cross-scoped.
- [x] Archived/closed/unavailable surveys are rejected.
- [x] In-progress source responses are rejected without insertion.
- [x] New attempt has deterministic ID/token and empty answer data.
- [x] Respondent name, email, and test-entry context are preserved.
- [x] Idempotency replay returns the original retry row without duplication.
- [x] New token can be read, progressed, and submitted through the existing public flow.
- [x] File-backed DuckDB reopen preserves the retry row and token.
- [x] Core3 authenticated desktop/mobile render evidence has no failed requests or overflow.
- [x] Odoo authenticated desktop/mobile blocker is captured verbatim.
