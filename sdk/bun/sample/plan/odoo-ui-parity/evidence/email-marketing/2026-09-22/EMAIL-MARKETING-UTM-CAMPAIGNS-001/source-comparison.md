# Source comparison

| Odoo behavior | Existing Core3 state | Bounded change |
| --- | --- | --- |
| `mass_mailing.action_view_utm_campaigns` opens `utm.campaign` in `kanban,list,form` with domain `is_auto_campaign = False` | `/email-campaigns` is an existing synthetic mailing workflow over `email_campaigns`, not `utm.campaign` | Add page/API-joined `/email-marketing/campaigns` over `email_marketing_utm_campaigns`; preserve the existing mailing route. |
| Campaign form exposes Campaign Name, Responsible, Stage, Tags, active state, and mailing count | No durable UTM campaign model or source-backed stage/user/tag campaign form existed | Add durable campaign records, deterministic stage/tag display, CRUD, archive/restore, and mailing stat navigation. |
| Campaign list search groups by Stage, Responsible, and Tags; Campaigns menu requires `mass_mailing.group_mass_mailing_campaign` | Existing Email Marketing menu had no distinct UTM campaign action | Map campaign-manager access to `email_marketing.manage`; add Kanban/List tabs, search, active filter, groupings, empty state, and row navigation. |
| Odoo fixture creates the `Newsletter` campaign with Schedule stage, Administrator, and Marketing tag | Only synthetic email mailing fixtures existed | Seed four deterministic campaigns, including Newsletter, active workflow examples, and one archived row. |

Source files read:

- `/home/nhanjs/projects/odoo/addons/mass_mailing/views/utm_campaign_views.xml`
- `/home/nhanjs/projects/odoo/addons/utm/views/utm_campaign_views.xml`
- `/home/nhanjs/projects/odoo/addons/mass_mailing/models/utm_campaign.py`
- `/home/nhanjs/projects/odoo/addons/utm/models/utm_campaign.py`
- `/home/nhanjs/projects/odoo/addons/mass_mailing/demo/utm.xml`
