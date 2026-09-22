# Functionality checklist

| Stable behavior | Result |
| --- | --- |
| Product template action | Pass: navigates to `/putaway-rules` with `product_template_id` and company context |
| Product variant action | Pass: navigates to `/putaway-rules` with `product_id` and company context |
| Product/category domain | Pass: Storage Box returns its product-specific and Office Supplies category rules |
| Empty context | Pass: unrelated Corner Desk returns no rows |
| Company scope | Pass: an outside company returns no rows |
| Transport guard | Existing Putaway Rules datasource retains its declared 503 state |
| Durable fixture | Pass: migration replay and file-backed restart retain `putaway-product-storage-box` |
| Mutation boundary | Pass by contract: contextual action is read-only; Putaway CRUD remains manager-owned |

The existing global Putaway Rules CRUD and validation slice remains covered by
`inventory_putaway_rules.integration.test.ts`; this feature only adds the
product-form context action and filtering.
