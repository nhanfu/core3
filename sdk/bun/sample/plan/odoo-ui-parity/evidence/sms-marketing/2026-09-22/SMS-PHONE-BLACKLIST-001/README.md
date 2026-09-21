# SMS-PHONE-BLACKLIST-001

Bounded feature: SMS Marketing → Configuration → Blacklisted Phone Numbers.

The implementation is limited to SMS Marketing module paths. It adds the Odoo
phone blacklist list/form/search contract, durable active/archive state,
manager-only CRUD and state actions, and deterministic migration fixtures.

Reference limitation: authenticated Odoo `core3_reference` was reachable, but
its Apps catalog showed SMS Marketing as installable and its launcher had no SMS
Marketing menu. `mass_mailing_sms` was not available for an authenticated
screen capture. This evidence does not claim paired visual parity.
