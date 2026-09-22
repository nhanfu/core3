# Source comparison

| Odoo source contract | Core3 mapping | Result |
| --- | --- | --- |
| `mailing.mailing.action_test()` opens `mailing.sms.test` | `test_sms_mailing` server form on `sms-campaign-detail` | implemented |
| Wizard `numbers` textarea and `Send Test` button | Required `Number(s)` textarea and `Send Test` submit label | implemented |
| `action_send_sms` sanitizes valid numbers and reports invalid input | YAML computes valid count, skipped numbers, and `Sent`/`Skipped` status | bounded |
| Mailing user action | `sms_marketing.write` permission | implemented |
| Parent mailing required | Company and optimistic row-version guards | implemented |

Sources read:

- `/home/nhanjs/projects/odoo/addons/mass_mailing_sms/models/mailing_mailing.py`
- `/home/nhanjs/projects/odoo/addons/mass_mailing_sms/wizard/mailing_sms_test.py`
- `/home/nhanjs/projects/odoo/addons/mass_mailing_sms/wizard/mailing_sms_test_views.xml`
