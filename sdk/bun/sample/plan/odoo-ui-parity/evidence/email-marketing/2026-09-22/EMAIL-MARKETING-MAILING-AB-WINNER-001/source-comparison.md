# Source comparison

## Odoo 19 source

- Addon: `/home/nhanjs/projects/odoo/addons/mass_mailing`
- Source revision: `659759969d535d286b656c96b675e4612b925ddd`
- View: `views/mailing_mailing_views.xml`
- Model implementation: `models/mailing.py`
- Source actions: `action_select_as_winner`, `action_send_winner_mailing`,
  and `action_ab_testing_open_winner_mailing`.

The source form exposes **Send this as winner** when the mailing is an active
A/B variant whose campaign is not complete and winner selection is manual.
`action_select_as_winner` copies the variant, sets `ab_testing_pc` to 100,
launches the copy into the queue, and returns the winner form action. The
automatic metric-based `action_send_winner_mailing` path is separate.

## Core3 mapping

Core3 keeps presentation in `pages/mailing-detail.yaml` and the mutation and
datasource contract in `api/mailing-detail.yaml`, joined by `page.id`.
Migrations 022/023 add stable A/B group and winner metadata and two sent
variants. `select_ab_winner_email_mailing` creates
`email-mailing-ab-winner-<source-id>` in `In Queue` with 100% audience,
marks the source group complete, and returns the durable winner row.

The mapping intentionally defers Odoo's automatic metric selection, comparison
window, rich email builder, returned-form navigation, and chatter. Those are
separate bounded work items.
