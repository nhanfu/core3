# Functionality checklist

| Acceptance item | Result |
| --- | --- |
| Durable `active` schema upgrade is idempotent | PASS; migration `20260921100000-036-fleet-contract-crud.yaml` adds the column/index and backfills existing rows |
| Page YAML remains presentation-only and API joins by `page.id` | PASS |
| Create with generated stable runtime ID and active/default status | PASS |
| Edit with required fields, active vehicle relation, dates/cost/status guards | PASS |
| File-backed reload and migration replay | PASS |
| Optimistic stale edit/delete rejection | PASS |
| Archive and restore with repeat-state guards | PASS |
| New/Running/Expired/Cancelled status actions with cancelled reopen guard | PASS |
| Delete with missing-row guard | PASS |
| Fleet read versus write permission declarations | PASS; reads use `fleet.read`, mutations use `fleet.write` |
| Desktop/mobile authenticated Core3 form/list comparison | BLOCKED by backend 502/host `EMFILE` descriptor exhaustion during browser load |
| Fresh authenticated Odoo contract comparison | BLOCKED; Fleet is absent from the live app launcher |
