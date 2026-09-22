# Source comparison

| Odoo contract | Core3 before this slice | Core3 after this slice |
| --- | --- | --- |
| `action_preview_sale_order` object action | No Preview action on `sale-order-detail` | `preview_sale_order` navigates to `/order/sale-order/preview` with `orders.read` |
| Portal order preview | No Sales preview page/API | `sale-order-preview` page/API pair with order, line, total, terms, and back action |
| Record access | Existing order detail is branch-scoped | Preview sources preserve the same `view_scope`/`current_branch_id` boundary |
| Failure behavior | No contract | Explicit not-found and transport-error datasource states |
| Persistence | No preview surface to reopen | Existing durable order/line data is read after migration replay and file-backed reopen |
