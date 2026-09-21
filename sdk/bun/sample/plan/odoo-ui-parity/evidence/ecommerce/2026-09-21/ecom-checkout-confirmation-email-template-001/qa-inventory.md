# QA inventory

## Control/state pairs

| Surface | Control | State | Evidence |
| --- | --- | --- | --- |
| Confirmation Email | template select | active sale-order templates | focused integration test |
| Confirmation Email | Save Email | valid update | policy row version 1 to 2 |
| Confirmation Email | Save Email | wrong company | 409 `ECOMMERCE_CONFIRMATION_EMAIL_POLICY_STALE` |
| Confirmation Email | Save Email | invalid/inactive template | 422 `ECOMMERCE_CONFIRMATION_EMAIL_TEMPLATE_INVALID` |
| Authenticated checkout | confirm order | selected template snapshot | durable order projection |
| Guest checkout | guest checkout | selected template snapshot | durable order projection |
| Orders | detail/list | template ID and name | order API/page contract |
| Persistence | restart | selected template retained | file-backed DuckDB test |

## Exploratory scenarios

1. Select Website Sale Confirmation, create both a signed-in and guest order,
   then change the company policy and verify existing order snapshots do not
   change while future orders use the new policy.
2. Replay a stale Save Email request after a successful update and verify the
   selected template remains unchanged.

Rendered desktop/mobile and authenticated Odoo states remain blocked as
documented in `browser-check.md`.
