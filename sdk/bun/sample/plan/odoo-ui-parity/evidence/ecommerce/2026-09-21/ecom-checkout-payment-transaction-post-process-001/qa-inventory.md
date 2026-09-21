# QA inventory

Claims and controls checked for this bounded slice:

| Claim/control | Functional check | Required visual state | Evidence |
| --- | --- | --- | --- |
| Transaction post-processing is durable | migration replay, action update, restart query | transaction row with processed state/timestamp | `test-results.md`; browser blocked |
| Post-process is one-shot | repeat action and stale version reject | action hidden after completion; error notification | `functionality.md`; browser blocked |
| Company/permission boundary | `ecommerce.read` datasource and `ecommerce.write` action; wrong company rejection | authorized/forbidden transaction action | `source-comparison.md`; browser blocked |
| State transition reset | pending transaction post-process then authorize clears state | new-state row exposes action again | `functionality.md`; browser blocked |
| Checkout compatibility | checkout and saved-token regressions preserve transaction creation | payment transaction list after checkout | `test-results.md`; browser blocked |

Exploratory/off-happy-path scenarios included: wrong-company processing,
stale-version replay, repeated idempotent processing, restart after processing,
and post-processing followed by a state transition. No module sign-off is
claimed without rendered authenticated evidence.
