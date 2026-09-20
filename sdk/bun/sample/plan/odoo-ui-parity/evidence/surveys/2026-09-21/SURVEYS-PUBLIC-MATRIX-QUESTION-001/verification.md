# Verification

Focused API verification proves:

1. The public catalog returns the Matrix question with five deterministic rows,
   four deterministic columns, and `matrix_subtype: multiple`.
2. A foreign row and a foreign column return HTTP 422
   `SURVEY_PUBLIC_ANSWER_INVALID` while `answer_data` remains `{}`.
3. Valid row-to-column JSON is written through the `surveys.public.progress`
   YAML mutation and survives file-backed DuckDB reopen.
4. Concurrent submit calls with one idempotency key return two successful
   responses while retaining one idempotency row, one submitted response, and
   one response-count increment.
5. A wrong answer token returns HTTP 404 without disclosure.

The Core3 process was stopped after its bounded readiness window because its
backend did not expose port 4340. Desktop/mobile probes therefore record
`ERR_CONNECTION_REFUSED`; no Core3 visual sign-off is claimed.

The Odoo desktop/mobile probes reached HTTP 200 only after redirecting to the
login form at `/web/login?redirect=%2Fodoo%3F`; no authenticated Matrix fixture
was available. No paired Odoo sign-off is claimed.
