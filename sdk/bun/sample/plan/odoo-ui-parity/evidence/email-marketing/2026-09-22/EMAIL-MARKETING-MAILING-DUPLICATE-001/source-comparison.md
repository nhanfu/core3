# Source comparison

| Odoo behavior | Existing Core3 state | Change |
| --- | --- | --- |
| Completed mailing form has Duplicate object action | `pages/mailing-detail.yaml` had no duplicate control | Add a conditional detail header action. |
| `action_duplicate` copies a mailing into a new draft form | `api/mailing-detail.yaml` had no duplicate mutation | Add a YAML `server_form` insert contract with copy fields, reset defaults, source/state guards, and durable result. |
| Copy creates a distinct record and does not send mail | No duplicate-owned persistence path | Generate an owned copy ID and reset workflow/metrics in the insert defaults. |
| Odoo installed reference UI | Live `core3_reference` app menu lacks Email Marketing | Browser comparison is blocked and recorded, not approximated. |
