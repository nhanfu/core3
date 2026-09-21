# QA inventory

## Control/state pairs

| Surface | Control | State | Evidence |
| --- | --- | --- | --- |
| Tax Display Policy | mode select | `tax_excluded` / `tax_included` | focused integration test |
| Tax Display Policy | Save Policy | valid update | row version 1 to 2 and result label |
| Tax Display Policy | Save Policy | wrong company | 409 `ECOMMERCE_TAX_DISPLAY_POLICY_STALE` |
| Tax Display Policy | Save Policy | invalid mode | 422 `ECOMMERCE_TAX_DISPLAY_POLICY_INVALID` |
| Cart | subtotal indicator | excluded/included | cart datasource projection |
| Checkout | subtotal indicator | excluded/included | checkout datasource projection |
| Public cart | subtotal indicator | excluded | public operation query |
| Persistence | restart | selected mode retained | file-backed DuckDB test |

## Exploratory scenarios

1. Change the company policy to Tax Included, refresh the cart/checkout data
   sources, and verify both labels change without changing line quantities or
   amount totals.
2. Replay a stale Save Policy request after a successful update and verify the
   selected mode remains unchanged.

Rendered desktop/mobile and authenticated Odoo states remain blocked as
documented in `browser-check.md`.
