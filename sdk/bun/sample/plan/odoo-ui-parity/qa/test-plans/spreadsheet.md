# Spreadsheet detailed QA test plan

Module: spreadsheet  
QA owner: spreadsheet-qa  
Developer owner: spreadsheet module owner  
Reference addon/version: spreadsheet and spreadsheet_dashboard, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan follows [`spreadsheet.md`](../../spreadsheet.md); executed evidence
is recorded in [`../spreadsheet.md`](../spreadsheet.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Dashboards | dashboard landing/detail/analysis routes | Groups, dashboard cards, workbook snapshots, figures, filters and read-only states |
| Configuration | dashboard group list/detail routes | Group CRUD, nested dashboards, publication, company/group visibility and protected official groups |
| Sharing/export | share/data/download routes when enabled | Public token access, revoked/invalid tokens, read-only data and authenticated download |
| Spreadsheet runtime | canvas/editor surface | Formula, chart, pivot, table, map, treemap, global filters, print/copy/freeze and mobile pan/zoom |

Actors are Dashboard Manager, system user, ordinary internal user,
company-restricted user, public share visitor, wrong-company user and
unauthenticated user. Fixtures use the seven official groups, stable
dashboards, workbook snapshots, figures, filters and share tokens.

## Functional and data cases

| Case ID | Surface | Expected result and persistence assertion | Status |
| --- | --- | --- | --- |
| SHEET-FUNC-001 | Dashboard landing | Group selection, cards, date filters and selected dashboard load deterministic persisted data | pass: focused suite and captures |
| SHEET-FUNC-002 | Group configuration | List/form, nested dashboards, ordering and required-name validation persist | pass: focused suite and captures |
| SHEET-FUNC-003 | Workbook runtime | Snapshot, formulas, figures, linked cells and global filters render without client-only fixture replacement | partial: persisted date-range filter slice; editor/formula interactions remain planned |
| SHEET-FUNC-004 | Publication/access | Publish/archive, company/group visibility and official-group deletion guards enforce source permissions | pass at contract level; browser mutation planned |
| SHEET-FUNC-005 | Share/export | Valid/revoked/invalid share tokens, read-only data and authenticated download follow declared boundaries | planned implementation gate |
| SHEET-FUNC-006 | Empty/error/not-found | Empty groups, missing dashboards, malformed snapshots, forbidden and transport-error states are explicit | pass at contract level |
| SHEET-FUNC-007 | Migrations/seeds | Reapply schema/demo fixtures idempotently with deterministic groups, dashboards and snapshots | planned migration/restart gate |

## Workflow and integration cases

| Case ID | Workflow/integration | Expected result | Status |
| --- | --- | --- | --- |
| SHEET-WF-001 | Dashboard lifecycle | Draft → Published → Archived updates visibility and row version atomically | pass: `spreadsheet.integration.test.ts`; browser workflow remains planned |
| SHEET-WF-002 | Nested group management | Add/edit/remove dashboard in a group preserves ordering and company scope | pass at contract level |
| SHEET-WF-003 | Spreadsheet interaction | Filter/formula/chart/pivot/table actions update the workbook view without mutating unauthorized source records | partial: date-range filter persists per user with ACL/concurrency tests |
| SHEET-WF-004 | Share lifecycle | Create/revoke/share/download preserves read-only snapshot and token scope | planned |
| SHEET-WF-005 | Durable/external boundary | Snapshot generation, exports, notifications and third-party callbacks use Temporal when durable; retry, replay, restart and compensation are tested | planned |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| SHEET-PERM-001 | Manager/system user | Group/dashboard configuration and permitted publication actions succeed | planned browser actor gate |
| SHEET-PERM-002 | Ordinary internal user | Only permitted published dashboards and read-only workbook data are visible | partial: viewer filter state is user-bound; full company/group ACL remains planned |
| SHEET-PERM-003 | Public share visitor | Only valid, non-revoked share snapshots are visible; no editor/configuration access | planned |
| SHEET-PERM-004 | Wrong company | Other-company groups, dashboards, snapshots and shares are not leaked or mutable | planned |
| SHEET-PERM-005 | Unauthenticated/expired | Redirect/401/403 without protected workbook data | planned |
| SHEET-PERM-006 | Stale/missing/invalid | 409/404/422 leaves current group/dashboard/share unchanged | pass at contract level |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| SHEET-UI-001 | Dashboard canvas | 1440x900, 390x844 | Shell, cards, toolbar, filters, canvas and mobile controls match Odoo | pass for captured dashboard slice; full runtime pending |
| SHEET-UI-002 | Group list/form | both | List, handle, nested notebook, fields and responsive layout match Odoo | pass for captured configuration slice |
| SHEET-UI-003 | Share/editor/error states | both | Read-only share, editor, loading, empty and denied states match Odoo | planned paired capture |
| SHEET-UI-004 | Current route regression | all manifest-owned Spreadsheet routes | Authenticated/public desktop/mobile checks have no blank/redirect, page/request error or overflow | planned fresh matrix |

## Exit criteria

Full Spreadsheet sign-off requires the focused suite, authenticated group and
dashboard CRUD, workbook runtime/share/export workflows, all actor/company
boundaries, reload/restart persistence, and paired Odoo desktop/mobile
comparisons. Existing dashboard/configuration captures cover only a bounded
slice and are not module completion.
