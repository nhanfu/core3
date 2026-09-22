# Functionality checklist

| Case | Result |
| --- | --- |
| Stable source action and source revision | **PASS** — exact XML action, modes, context, and access row asserted. |
| Page/API `page.id` seam | **PASS** — list/detail layout and API fragments discover through matching IDs. |
| Mailing scope and filters | **PASS** — newsletter, reply filter, spring isolation, missing scope, and empty state are tested against durable rows. |
| Persistence and deterministic seed | **PASS** — existing fixed-date trace migration is replayed idempotently and queried from real storage. |
| Permission/error boundary | **PASS** — read permission plus 401/403/404/503 declarations are asserted. |
| Authenticated installed-reference visual proof | **BLOCKED** — BrowserSkill tab ownership/confirmation prevented navigation. |
