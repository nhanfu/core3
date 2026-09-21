# QA inventory

Claims and controls checked for this bounded slice:

| Claim/control | Functional check | Required visual state | Evidence |
| --- | --- | --- | --- |
| Company policy is durable | migration replay, update, restart query | policy form showing selected mode | `test-results.md`; browser blocked |
| Stay on Product Page mode | policy result and authenticated add return `/ecommerce/shop` | desktop/mobile policy form and add result | `functionality.md`; browser blocked |
| Go to cart mode | policy result and authenticated/anonymous add return `/ecommerce/cart` | desktop/mobile selected mode and cart navigation | `functionality.md`; browser blocked |
| Permission and validation boundary | wrong company, invalid mode, stale version | forbidden/error notification | `functionality.md`; browser blocked |
| Cart persistence | repeated add increments durable line quantity | cart page after add on desktop/mobile | `functionality.md`; browser blocked |

Exploratory/off-happy-path scenarios included: an invalid mode is rejected;
a stale version is rejected after a successful concurrent update; and an
anonymous cart is exercised separately from a customer cart. No module sign-off
is claimed without rendered authenticated evidence.
