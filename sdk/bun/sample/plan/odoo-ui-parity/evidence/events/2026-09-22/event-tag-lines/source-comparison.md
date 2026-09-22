# Source comparison and gap matrix

| Odoo contract | Core3 before | Core3 change | Acceptance |
| --- | --- | --- | --- |
| event_tag_category_action_tree list/form | Category list and summary-only detail fields | Kept existing route and joined a child datasource by page.id | Page/API discovery test |
| Form tag_ids x2many | No durable event.tag table or child actions | Added event_tags, deterministic rows, LineItemGrid, Add a line, edit, delete | CRUD/restart test |
| sequence, name, color_picker | No child fields | Added ordered sequence, required tag name, numeric color index 0-11 | Source contract and validation tests |
| Category tag summary | Fixture-only tags text | Child mutations reproject ordered names to the category row and list query | Create/edit/delete assertions |
| Permission and concurrency | Category actions only | Child mutations require events.write; parent and line versions guard stale writes | Mutation error assertions |

Bounded residuals: the shared Core3 line editor represents Odoo's numeric
color_picker through its existing number input; the source's visual color-chip
palette is not claimed without live desktop/mobile comparison. Odoo's exact
responsive shell and menu geometry remain unverified because BrowserSkill could
not borrow the authenticated tab.
