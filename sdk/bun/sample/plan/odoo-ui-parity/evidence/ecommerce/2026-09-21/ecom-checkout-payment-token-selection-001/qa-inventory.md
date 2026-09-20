# QA inventory

| Claim/control | Functional check | Visual state/evidence |
| --- | --- | --- |
| Odoo token source mapping | Controller, payment form, transaction model, and security source assertions | Source comparison document |
| Token option filtering | Open-cart/customer/company/provider query returns deterministic masked token | Authenticated checkout capture blocked by unavailable Core3 runtime |
| Selection permission | Checkout action is `ecommerce.write`; token source is `ecommerce.read` | Authenticated actor capture blocked |
| Ownership/company/method validation | Missing and foreign-customer token calls return 422 with no order/cart mutation | Error state service-tested; browser blocked |
| Transaction linkage/idempotency | Valid token stores `token_id` and `offline_token`; closed-cart replay is rejected | Transaction state is service-tested; live gateway remains open |
| Restart durability | File-backed DuckDB preserves token linkage and order after reopen | Restart assertion in focused test |

No Ecommerce module sign-off is claimed. Live provider execution, broader
actor/company browser coverage, and paired Odoo rendering remain open.
