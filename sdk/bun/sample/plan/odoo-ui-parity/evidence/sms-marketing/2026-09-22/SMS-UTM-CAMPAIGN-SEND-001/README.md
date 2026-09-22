# SMS-UTM-CAMPAIGN-SEND-001

Bounded SMS Marketing feature: create an SMS mailing from the UTM campaign
form, preserving the Odoo `Send SMS` action contract and a durable campaign
relationship.

- Odoo source: `/home/nhanjs/projects/odoo/addons/mass_mailing_sms/models/utm.py` and `views/utm_campaign_views.xml`
- Core3 page/API join: `sms-utm-campaign-detail`
- Focused test: `sdk/bun/sample/test/sms_marketing_utm_campaigns.integration.test.ts`
- Browser evidence: blocked before capture; see `verification.md`
