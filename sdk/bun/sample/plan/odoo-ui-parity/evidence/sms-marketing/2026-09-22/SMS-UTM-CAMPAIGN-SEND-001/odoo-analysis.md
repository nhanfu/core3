# Odoo analysis

The local Odoo 19 source defines the SMS campaign form button in
`addons/mass_mailing_sms/views/utm_campaign_views.xml`:

- `name="action_create_mass_sms"`
- `string="Send SMS"`
- visible to `mass_mailing.group_mass_mailing_user`
- hidden when the mailing campaign is not activated

`addons/mass_mailing_sms/models/utm.py` implements the action by opening
`mass_mailing.action_create_mass_mailings_from_campaign` and setting the active
campaign, `default_mailing_type: sms`, assigned-user defaults, and the campaign
search default. The source action creates a mailing form; it does not send an
SMS immediately.
