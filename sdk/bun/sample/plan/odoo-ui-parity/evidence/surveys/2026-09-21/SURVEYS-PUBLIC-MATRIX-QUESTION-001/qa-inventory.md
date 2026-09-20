# QA inventory: SURVEYS-PUBLIC-MATRIX-QUESTION-001

Feature: token-scoped public Matrix question lifecycle.

| Check | Expected evidence |
| --- | --- |
| Paired contracts | `pages/surveys.yaml` and `api/surveys.yaml` retain `page.id: surveys`; public question projections expose matrix rows/columns. |
| Matrix renderer | Public renderer shows source-defined rows and columns, with multi-select cells for the Odoo `matrix_subtype: multiple` behavior. |
| Invalid mutation | Foreign row/column values return `422 SURVEY_PUBLIC_ANSWER_INVALID` without changing `answer_data`. |
| Persistence | Valid row-to-column JSON survives file-backed DuckDB reopen. |
| Concurrency/idempotency | Concurrent submit with one idempotency key produces one submitted response and one response-count increment. |
| Token boundary | Wrong answer token returns 404 without disclosure. |
| Core3 browser | Authenticated desktop/mobile public-route probes and screenshot artifacts, if the shared runtime starts. |
| Odoo comparison | Authenticated desktop/mobile reference probes and exact installed/fixture blocker evidence. |

Exploratory browser checks: public matrix question render at 1440x900 and
390x844; invalid foreign cell and concurrent submit are covered by the
focused integration test rather than browser-only mutation.
