# Functionality checklist

| Case | Expected | Result |
| --- | --- | --- |
| `MAINT-ANALYSIS-REPORT-001-F01` | Page and API YAML join on `maintenance-analysis`; page contains no backend datasource | pass |
| `MAINT-ANALYSIS-REPORT-001-F02` | Active is the default report scope and Cancelled is an explicit alternate scope | pass in contract and datasource tests |
| `MAINT-ANALYSIS-REPORT-001-F03` | Persisted rows expose responsible, stage, Duration, Repeat Every, and Count fields | pass; no constant duration placeholder remains |
| `MAINT-ANALYSIS-REPORT-001-F04` | Graph exposes the source-aligned dimensions and three measures | pass in YAML contract test |
| `MAINT-ANALYSIS-REPORT-001-F05` | Pivot exposes source-aligned fields and deterministic Count default | pass in YAML contract test |
| `MAINT-ANALYSIS-REPORT-001-F06` | Empty fixture returns no fabricated report rows | pass |
| `MAINT-ANALYSIS-REPORT-001-F07` | Permission remains `maintenance.read` | pass in YAML contract and existing permission corpus |
| `MAINT-ANALYSIS-REPORT-001-F08` | File-backed restart and migration replay preserve identical report rows | pass |
| `MAINT-ANALYSIS-REPORT-001-F09` | Authenticated Odoo desktop/mobile reference is captured | pass; Odoo captures present |
| `MAINT-ANALYSIS-REPORT-001-F10` | Authenticated Core3 desktop/mobile comparison is captured | blocked; exact blocker in `verification.md` |
