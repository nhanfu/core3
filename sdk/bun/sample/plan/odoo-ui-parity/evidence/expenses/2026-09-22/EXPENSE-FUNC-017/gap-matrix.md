# EXPENSE-FUNC-017 gap matrix

| Stable gap | Required behavior | Implementation | Evidence |
| --- | --- | --- | --- |
| `EXPENSE-FUNC-017-VIEWS` | Department approval exposes list, kanban, form, pivot, graph in Odoo order | `pages/to-approve.yaml` declares the five modes in source order | Focused integration test |
| `EXPENSE-FUNC-017-FORM` | Form mode opens the stateful expense detail surface | Shared `form_view` points to `pages/expense-detail.yaml` with full-page mode; row open and double-click use `view_expense_detail` | YAML contract and page discovery assertions |
| `EXPENSE-FUNC-017-SCOPE` | Form navigation preserves department-scoped submitted rows and existing approval/refusal guards | Existing `expenses_department_to_approve` datasource and API actions remain unchanged | Department approval regression suite |
| `EXPENSE-FUNC-017-STATES` | Empty, transport-error, permission, and receipt validation behavior remain explicit | Existing datasource error/empty states and manager-only mutation guards are preserved | Existing focused suite plus regression run |
| `EXPENSE-FUNC-017-VISUAL` | Authenticated Odoo/Core3 desktop/mobile comparison | Blocked: tab `1770662590` was owned by session `yabv` | No visual claim or captures |
