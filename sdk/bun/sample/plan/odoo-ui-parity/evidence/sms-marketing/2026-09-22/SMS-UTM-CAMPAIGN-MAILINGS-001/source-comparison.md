# Source comparison

| Odoo 19 contract | Core3 mapping | Result |
| --- | --- | --- |
| `utm_campaign_view_form` adds the `SMS` notebook page over `mailing_sms_ids` | `utm-campaign-detail.yaml` adds an `SMS` content slot and nested `ListView` | implemented |
| Date, Title, Recipients, Responsible, Sent, Clicked, Bounced, A/B Test, Status | `sms_utm_campaign_mailings` query and declarative list columns | implemented |
| `action_duplicate` copies the SMS mailing from the campaign form | `duplicate_sms_utm_campaign_mailing` inserts a Draft linked SMS mailing | implemented |
| Campaign relation and count remain durable | `campaign_id`, migration projection, parent count/version update | implemented |

Source files read:

- `/home/nhanjs/projects/odoo/addons/mass_mailing_sms/views/utm_campaign_views.xml`
- `/home/nhanjs/projects/odoo/addons/mass_mailing/models/mailing.py`
