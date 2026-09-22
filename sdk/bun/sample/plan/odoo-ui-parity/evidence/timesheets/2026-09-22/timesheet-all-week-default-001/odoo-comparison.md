# Odoo comparison

The local source comparison passed for `timesheet_action_all`:

| Odoo behavior | Core3 result |
| --- | --- |
| Action id `timesheet_action_all` | Covered by the focused source assertion |
| Route `/odoo/all-timesheets` | Core3 page route `/all-timesheets` |
| Context `search_default_week: 1` | Core3 page `default_filters.work_date: this_week` |
| Internal permission boundary | `timesheets.manage` remains on page and datasource |
| Separate page/API contracts | `page.id: all-timesheets` joins them |

Live authenticated Odoo UI observation was blocked by the borrowed-tab
condition documented in `browser-blocker.txt`. Therefore this artifact has no
desktop/mobile screenshots and does not claim visual parity.
