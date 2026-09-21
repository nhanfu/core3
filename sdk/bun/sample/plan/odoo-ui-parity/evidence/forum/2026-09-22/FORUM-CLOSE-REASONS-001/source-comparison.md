# FORUM-CLOSE-REASONS-001 — source comparison

Date: 2026-09-22
Reference: local Odoo 19 source at `/home/nhanjs/projects/odoo`
Bounded feature: authenticated Post Close Reasons list

## Odoo source

- `addons/website_forum/views/forum_menus.xml:35-40` declares
  `menu_forum_post_reasons`, label `Close Reasons`, sequence 50, and action
  `forum_post_reason_action`.
- `addons/website_forum/views/forum_post_reason_views.xml:4-20` declares the
  `forum_post_reason_view_list` editable-bottom list with `name` and
  `reason_type`, and the list action at `/forum-close-reasons` with
  `view_mode=list`.
- `addons/website_forum/models/forum_post_reason.py:7-13` defines
  `forum.post.reason`, orders by `name`, requires `name`, and limits
  `reason_type` to `basic` or `offensive` with default `basic`.
- `addons/website_forum/data/forum_post_reason_data.xml` supplies 13 stable
  demo reasons: eight `basic` reasons and five `offensive` reasons.
- Ranks and Badges in the same menu are actions owned by the external
  `gamification` addon (`gamification_karma_ranks_action` and
  `badge_list_action`), so they are not part of this `website_forum` bounded
  implementation.

## Core3 mapping

| Odoo contract | Core3 implementation |
| --- | --- |
| `/forum-close-reasons`, editable list | `services/forum/pages/close-reasons.yaml` |
| `name`, `reason_type` columns | `services/forum/api/close-reasons.yaml` datasource and inline-edit fields |
| `basic` / `offensive` selection | API create/edit validation guards and select options |
| durable model records | migrations `20260922110000-008...` and `20260922110001-009...` |
| Odoo menu entry | Forum manifest `menu.community.items` entry |
| manager mutation boundary | `forum.manage` on create/edit/delete; `forum.read` on list |
| optimistic row behavior | required `expected_row_version` on update/delete |

The page file contains presentation only. Datasources and actions live in the
API file and are joined by `page.id: forum-close-reasons`.
