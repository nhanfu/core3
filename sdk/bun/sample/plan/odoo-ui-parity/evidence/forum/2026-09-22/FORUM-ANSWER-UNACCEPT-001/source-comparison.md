# Source comparison

| Odoo source behavior | Existing Core3 before this wave | Change |
| --- | --- | --- |
| `post_toggle_correct` reverses `is_correct` and keeps one accepted answer | `accept_forum_answer` only moved an answer to `Accepted`; no reverse action | Added `unaccept_forum_answer`, `forum.answers.unaccept`, and `Accepted`-state UI guard |
| Odoo answer row exposes accepted state in the question form | Core3 answer relation exposed `state`, but only `Accept` and `Flag` actions | Added `Unaccept` in both relation action declarations |
| Odoo action checks answer/question relationship and current record state | Core3 answer mutations already used `post_id`, parent version, answer version, and manager permission | Reused the same atomic optimistic-concurrency contract for the reverse transition |
| Odoo page/action view is model-backed | Core3 question detail mixed datasources/actions into its page YAML | Moved all question-detail datasources/actions to `api/question-detail.yaml`; page remains presentation-only |

Core3 maps Odoo's karma-based acceptance right to the existing authenticated
`forum.manage` permission for this bounded module contract. The mapping is
explicit and keeps direct API enforcement; karma-based user-level rights remain
outside this slice.
