# Spreadsheet — sub-plan

Status: `planning`

## Reference and availability

- Odoo addon/version: `spreadsheet`, Odoo 19 Community.
- Source availability: available in the supplied Odoo 19 checkout (per main register).
- Official demo data: verify the `spreadsheet` manifest's demo declaration; use supplied templates/workbooks where available.
- Core3 service: `spreadsheet`.

## Menu, action, and view inventory

- Spreadsheet dashboard, My Spreadsheets, Shared With Me, Templates, Recent, and trash/settings where exposed.
- Workbook grid/editor: file menu, undo/redo, formatting toolbar, formulas, cell selection, sheets/tabs, filters, charts, pivot insertion, comments, share, and export.
- Spreadsheet list/grid/kanban with search, filters, ownership, sharing, pagination, empty state, and template create dialog.
- Linked document/pivot/chart panels, share/permission dialog, mobile toolbar/grid overflow, and loading/error states.

## Core3 backend mock-data coverage

Declare `spreadsheet_workbooks`, `spreadsheet_sheets`, `spreadsheet_cells`, `spreadsheet_formulas`, `spreadsheet_charts`, `spreadsheet_pivots`, `spreadsheet_templates`, `spreadsheet_users`, `spreadsheet_shares`, and `spreadsheet_comments`. Include deterministic workbook geometry, values/formula results, styles, chart series, pivot rows, selected cell, active sheet, permissions, empty/loading/error, dialog, mobile, and offline states. IDs must remain stable so each provider can later become a query.

## Shared UI primitives

Dashboard/file cards, grid/cell editor, formula bar, toolbar, sheet tabs, chart/pivot widgets, search/filter/pager, comments, share dialog, notifications, and responsive editor shell.

## Screenshots and acceptance checks

Capture `/odoo/spreadsheet` dashboard/editor and template/share routes at 1440x900 and 390x844. Compare workbook grid geometry, formulas/results, toolbar/menu hierarchy, chart/pivot rendering, permissions, mobile overflow, complete YAML fixtures, and backend-offline opening before `ready`.
