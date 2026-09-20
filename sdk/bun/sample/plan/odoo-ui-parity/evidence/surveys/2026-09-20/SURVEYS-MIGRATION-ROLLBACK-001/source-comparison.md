# SURVEYS-MIGRATION-ROLLBACK-001 source and gate comparison

Date: 2026-09-20  
Feature: DuckDB rollback/replay of the durable survey response graph

## Bounded fix

The active Surveys migration chain previously failed when DuckDB attempted to
alter `survey_responses` while indexes created by earlier migrations depended
on that table. Migration `0.0.17`
(`20260913100000-016-survey-public-idempotency.yaml`) now drops the dependent
access-token, survey, and idempotency indexes before removing `idempotency_key`,
then recreates the earlier indexes. This follow-up adds an explicit
access-token-bearing response row and asserts that the response row and both
dependent indexes survive rollback to `0.0.16` and replay to `0.0.18`.

## Lifecycle and boundaries

- Persistence: response id, survey relation, answer data, access token, and
  state survive rollback/replay.
- Restart: existing Surveys restart tests cover durable survey/question and
  participant state after file-backed close/reopen.
- Permission: existing YAML contracts keep mutations behind `surveys.write`
  and reads behind `surveys.read`; the authenticated browser matrix confirms
  Admin access and Fleet denial.
- UI: this migration-only repair introduces no new page. Existing
  authenticated Survey detail is smoke-tested at desktop and mobile.

The current Odoo database authenticated successfully as `codex@core3.local`,
but Surveys is uninstalled and `/odoo/surveys` redirects to Discuss. The Odoo
captures in this directory are truthful fallback evidence, not paired Surveys
visual sign-off.
