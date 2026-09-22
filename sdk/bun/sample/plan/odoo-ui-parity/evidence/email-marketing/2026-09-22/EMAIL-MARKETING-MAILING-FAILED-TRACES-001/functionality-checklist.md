# Functionality checklist

| Case | Result |
| --- | --- |
| Source action mapping | **PASS** — exact action and failed filter assertions. |
| Page/API ownership | **PASS** — existing `mailing-detail` seam preserved. |
| Mailing/status scope | **PASS** — one real failed trace is selected by both predicates. |
| Permissions and error states | **PASS** — settings permission plus 401/403/503 boundaries. |
| Persistence/idempotence | **N/A** — read-only navigation. |
| Installed visual proof | **BLOCKED** — `core3_reference` showed Discuss only. |
