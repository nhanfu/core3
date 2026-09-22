# Source comparison

| Odoo behavior | Existing Core3 state | Bounded change |
| --- | --- | --- |
| `action_send_winner_mailing` selects the configured highest sent variant | Core3 had only the manual winner action | Add a YAML mutation that orders by the selected ratio and stable ID. |
| Automatic winner creates a final queued mailing at 100% | No automatic branch existed | Copy the selected durable mailing with a deterministic winner ID and reset delivery metrics. |
| A/B campaign becomes complete and replay is blocked | Manual branch only | Complete all active A/B siblings transactionally and guard an existing winner. |
| Source form exposes **Send Winner Now** only for eligible campaigns | No automatic action control existed | Add a page-only guarded header action; API owns the mutation. |
| Authenticated installed-Odoo visual reference | Shared tab was owned by another session | Record BrowserSkill blocker; make no visual-parity claim. |
