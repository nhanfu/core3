# SURVEYS-LIVE-SESSION-JOIN-001 source comparison

Date: 2026-09-20

## Odoo menu/action and source analysis

Odoo's `addons/survey/controllers/survey_session_manage.py` exposes the
public access-code entry at `/s`, the short-link route `/s/<session_code>`, and
the JSON-RPC validator `/survey/check_session_code/<session_code>`. Its
`_fetch_from_session_code` helper searches `survey.survey.session_code`,
rejects missing/certification surveys as `survey_wrong`, permits only `ready`
and `in_progress` sessions, and otherwise returns
`survey_session_not_launched`. A valid code redirects to the survey start URL.

The authenticated Odoo probe used `codex@core3.local`'s session cookie at
`127.0.0.1:8069` on desktop and mobile. The reference database has no matching
live session for Core3 code `5822`: `/survey/check_session_code/5822` returned
`{"error":"survey_wrong"}` and `/s/5822` rendered the access-code form. The
PNG captures and exact JSON response are retained in this directory. This is
a precise installed/reference-data blocker, not an Odoo parity sign-off.

## Core3 source comparison

Core3 keeps the page and backend contracts separate and joins them through
`page.id: survey-live-session-join`:

- `services/surveys/pages/live-session-join.yaml` provides the responsive
  authenticated host preview with a public Join Session action.
- `services/surveys/api/live-session-join.yaml` declares the
  `surveys.read` datasource and the `surveys.public` server action. The
  mutation derives deterministic attendee ID, token, join key, state, and
  row version from the session code and normalized name.
- `services/surveys/operations.yaml` and `services/surveys/module.ts` expose
  the unauthenticated GET/POST public session route. GET returns the current
  session/question only for Ready/In Progress non-certification sessions;
  POST is idempotent by join key and returns the durable attendee token.
- Migration `20260920200000-020-survey-live-session-join.yaml` adds durable
  attendee token, join key, and row version columns with unique indexes and a
  deterministic backfill. The rollback path drops/recreates dependent DuckDB
  indexes before removing the columns; migration 018 explicitly tears down
  its indexes before dropping the attendee tables.

The Core3 browser probe authenticated as `admin@tms.local`, started the
Feedback live session, joined with separate desktop/mobile names, and recorded
HTTP 200, `In Progress`, the current Rating question, deterministic tokens,
and no horizontal overflow at 1440x1000 and 390x844. Attendee answer
submission remains a separate open gap; this slice stops at durable
access-code join/rejoin.
