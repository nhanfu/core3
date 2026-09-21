# Email Marketing — Add Selected Contacts to a Mailing List

## Bounded source contract

- Odoo source revision: `65975996` in `/home/nhanjs/projects/odoo`.
- View: `addons/mass_mailing/wizard/mailing_contact_to_list_views.xml:4-27`.
- Model behavior: `addons/mass_mailing/wizard/mailing_contact_to_list.py:7-55`.
- Odoo test: `addons/mass_mailing/tests/test_mailing_list.py:46-93`.
- Action: `mailing_contact_to_list_action`, transient model
  `mailing.contact.to.list`, form target `new`.
- Required field: `Mailing List`; source-hidden input is the selected
  `mailing.contact` records.
- Source buttons: `Add`, `Add and Send Mailing`, and `Cancel`.
- `Add` creates only missing `mailing.subscription` rows and returns an info
  notification before closing the wizard.

Core3 implements the first bounded branch, `Add`, from the existing Mailing
List Contacts selection. The selected list rows resolve to their durable
`mailing_contacts` records; insertion is unique on `(contact_id, list_id)`,
list counts are recalculated transactionally, and the operation is replay-safe
across a file-backed restart. The companion `Add and Send Mailing` branch is
explicitly deferred because the current declarative server-form contract has no
supported notification `next` action that opens a new unsaved mailing form.

## Live reference blocker

The authenticated browser session used `http://localhost:8069` with the
`core3_reference` database. Apps → Email Marketing resolves to one card whose
HTML state is `uninstalled` and whose only primary action is `Request Access`;
the Email Marketing menu, Mailing List Contacts screen, and wizard therefore do
not exist in this live database. The desktop/mobile captures below are truthful
availability-blocker evidence, not installed visual references.

- Desktop: `/tmp/core3-odoo-parity/email-marketing-add-contacts-20260921/odoo-email-marketing-uninstalled-desktop-1440x900.png`
- Mobile: `/tmp/core3-odoo-parity/email-marketing-add-contacts-20260921/odoo-email-marketing-uninstalled-mobile-390x844.png`
- HTML confirmation: `/tmp/core3-odoo-parity/email-marketing-add-contacts-20260921/odoo-email-marketing-app.html`

The target-route network failure list was empty. Console output contained
browser-extension connection noise and one generic `ERR_FAILED`; no installed
Email Marketing route was reached. The Core3 isolated runner was also blocked
before browser capture by an unrelated out-of-scope Live Chat fragment failing
global discovery with `actions[0].fields must be a non-empty array`.

## Core3 implementation evidence

- Page: `services/email-marketing/pages/mailing-contacts.yaml`, joined to the
  API by `page.id: mailing-contacts`.
- API/action: `services/email-marketing/api/mailing-contacts.yaml`, action
  `add_selected_contacts_to_mailing_list`.
- Migration: none; the existing durable `mailing_contacts`,
  `mailing_subscriptions`, and `mailing_lists` schema is sufficient.
- Focused test: `test/email_marketing_add_contacts_to_list.integration.test.ts`.
- Regression test updated: `test/email_marketing_mailing_contact_import.integration.test.ts`.
- Focused command: `bun test ./test/email_marketing_add_contacts_to_list.integration.test.ts ./test/email_marketing_mailing_contact_import.integration.test.ts --timeout 20000`.
- Result: **8 passed, 0 failed, 50 assertions**.
