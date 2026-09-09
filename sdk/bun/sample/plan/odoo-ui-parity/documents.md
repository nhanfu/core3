# Documents — sub-plan

Status: `planning`

## Reference and availability

- Odoo addon/version: `documents`, Odoo 19 Community.
- Source availability: unavailable in supplied source (per main register).
- Official demo data: verify the Odoo 19 `documents` manifest when supplied; record demo declaration before implementation.
- Core3 service: `documents`.

## Menu, action, and view inventory

- Documents dashboard/workspaces, All Documents, My Documents, Shared, Favorites, Recent, Trash, and configuration/workspace settings.
- Kanban/list/grid with folders, tags, ownership, activities, share/upload/create/spreadsheet actions, search/filter/group/pager, and empty state.
- Document preview/details panel: file metadata, owner, workspace, tags, followers, activities, share/download/archive/delete/restore dialogs, and chatter where shown.
- Workspace/folder form, share link/permission dialog, upload dialog, mobile file cards and preview.

## Core3 backend mock-data coverage

Declare `documents_workspaces`, `documents_records`, `documents_folders`, `documents_tags`, `documents_users`, `documents_activities`, `documents_shares`, `documents_previews`, and `documents_settings`. Cover file types/thumbnails, folders, shared/favorites/recent/trash, permissions, upload/preview/share/delete/restore dialogs, empty/filter/group/pagination, mobile, and error/offline states. Include metadata, sizes, MIME/type, owners, dates, and permissions; IDs are query-swappable.

## Shared UI primitives

Workspace sidebar, dashboard, grid/list/kanban, search/filter/pager, file thumbnail/preview, metadata panel, upload/share dialogs, tags, activities, notifications, and responsive navigation.

## Screenshots and acceptance checks

Capture documented Odoo 19 Documents routes at 1440x900 and 390x844 when source/reference access is available. Validate workspace hierarchy, file actions, preview/permissions, empty/trash states, mobile upload/preview, complete YAML mocks, and backend-offline rendering before `ready`.
