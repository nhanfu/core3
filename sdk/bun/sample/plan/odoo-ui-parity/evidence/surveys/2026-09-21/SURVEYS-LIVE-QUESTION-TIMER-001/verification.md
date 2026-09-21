# Verification

The focused timer test passed after the migration was changed from constrained
DuckDB `ALTER TABLE` columns to unconstrained additions with deterministic
backfill/fixture values. It proves:

1. late submission returns HTTP 409 with code
   `SURVEY_SESSION_QUESTION_TIME_EXPIRED`;
2. the answer table and live-session counters remain unchanged on expiry;
3. a valid answer persists after moving the durable start timestamp forward;
4. reopening DuckDB preserves the answer and a replay returns the original
   answer without a second row; and
5. page/API `page.id` joining and renderer timer markers remain explicit.

The related live-session answer contract test was updated for the intentional
new guard. The existing test-entry fixture assertion was updated from one to
two total feedback responses because the repository already seeds the public
deadline response; its missing-entry assertion still needs separate cleanup.

Audit, scoped lint, and diff-check results are recorded in the final QA ledger
after the checks complete.
