# Functionality checklist

| Case | Acceptance | Result |
| --- | --- | --- |
| WCWO-F-001 | The scoped action has List, Form, Calendar, Pivot, and Graph modes with visible tabs | PASS: YAML test |
| WCWO-F-002 | Work Center ID and name scope rows to the selected durable work center | PASS: Assembly 1 and Assembly 2 query assertions |
| WCWO-F-003 | Finished and Cancelled rows are excluded by the source action domain | PASS: terminal filter assertion |
| WCWO-F-004 | Search, status, late, empty, and transport-error states are deterministic | PASS: focused integration test |
| WCWO-W-001 | Plan/Start/Pause/Continue/Block/Cancel reuse the existing guarded workflow | PASS: action contract assertion |
| WCWO-P-001 | Read requires `manufacturing.read`; mutations require `manufacturing.write`; no create/delete action exists | PASS: focused contract |
| WCWO-D-001 | Migration and durable rows survive a second full-chain replay without duplicate fixture rows | PASS: focused migration replay |
| WCWO-R-001 | Odoo desktop/mobile authenticated visual comparison | BLOCKED: reference profile redirects to Discuss |
