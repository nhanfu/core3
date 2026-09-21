# Functionality checklist

| ID | Case | Result |
| --- | --- | --- |
| WCLATE-F-001 | Page/API contracts join by `manufacturing-work-center-late`; page has no datasource SQL | pass: focused suite |
| WCLATE-F-002 | Overview Late action passes selected work center and default filter | pass: focused suite |
| WCLATE-F-003 | Query returns only selected-center non-terminal late rows; non-late and terminal rows are excluded from the default | pass: focused suite |
| WCLATE-F-004 | Search, state, late toggle, empty, and transport-error results are deterministic | pass: focused suite |
| WCLATE-F-005 | List/Form/Calendar/Pivot/Graph modes are declared and Work Order detail is reused | pass: focused suite and browser |
| WCLATE-W-001 | Existing guarded work-order actions are reused with `manufacturing.write` | pass: focused suite |
| WCLATE-D-001 | Migration replay and file-backed restart retain late rows | pass: focused suite |
| WCLATE-P-001 | Read requires `manufacturing.read`; mutations require `manufacturing.write`; no create/delete | pass: focused suite |
| WCLATE-U-001 | Odoo desktop/mobile authenticated captures | blocked: reference redirects to Discuss |
| WCLATE-U-002 | Core3 desktop/mobile authenticated captures | pass: bsk route checks; captures under `/tmp` |
