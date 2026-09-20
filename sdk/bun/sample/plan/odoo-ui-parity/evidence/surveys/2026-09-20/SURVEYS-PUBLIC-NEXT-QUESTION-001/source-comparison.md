# Source comparison

## Odoo reference

`/home/nhanjs/projects/odoo/addons/survey/controllers/main.py:537-611`
implements the source next-question lifecycle. It resolves the current page
or question, validates and saves answers, handles back/skip/last-question
branches, updates the answer's displayed position, and renders the next
question. The route is public but answer-token scoped.

## Core3 clone

- `services/surveys/module.ts:132-167` owns the public route and token/state
  validation.
- `services/surveys/api/surveys.yaml:111-130` declares the separate API
  action, `surveys.public` permission, YAML mutation, stale-cursor guard, and
  ordered-next guard.
- `services/surveys/operations.yaml:17-25` resolves first/current/next
  questions and idempotent navigation rows.
- `services/surveys/migrations/20260920230000-022-survey-public-navigation.yaml`
  adds and backfills the durable cursor/key columns and safely rolls back
  dependent DuckDB indexes.

The current bounded clone covers cursor advancement, durable response state,
token/actor guard behavior, replay, restart, and final-question handling. The
public HTML renderer integration is not claimed because its source is outside
the assigned module paths.
