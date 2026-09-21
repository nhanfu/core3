# QA inventory

## Control/state pairs

| Surface | Control | State | Evidence |
| --- | --- | --- | --- |
| Recovery Policy | enable checkbox | disabled/enabled | policy datasource and focused test |
| Recovery Policy | delay input | 10/24 hours | valid update and delay guard |
| Recovery Policy | template select | active sale-order template | options datasource |
| Recovery Policy | Save Recovery Policy | wrong company | 409 stale/scope error |
| Recovery Policy | Save Recovery Policy | invalid delay/template | 422 validation errors |
| Abandoned Carts | Send Recovery Email | disabled policy | 422 disabled error |
| Abandoned Carts | Send Recovery Email | eligible cart | sent ledger and row version |
| Abandoned Carts | Send Recovery Email | repeated/stale request | 409 idempotency boundary |
| Persistence | restart | policy and sent ledger retained | file-backed DuckDB test |

## Exploratory scenarios

1. Enable recovery, select a template, send a recovery email for one eligible
   cart, and verify the action disappears while another unsent cart remains
   eligible.
2. Replay a stale send request after a successful send and verify the sent
   ledger and row version remain unchanged.

Rendered desktop/mobile and authenticated Odoo states remain blocked as
documented in `browser-check.md`.
