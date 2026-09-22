# Source comparison

| Concern | Odoo 19 source | Core3 implementation | Status |
| --- | --- | --- | --- |
| Menu/action | mass_mailing_sms/views/mailing_sms_menus.xml → Campaigns → mass_mailing.action_view_utm_campaigns | services/sms-marketing/manifest.yaml → /sms-marketing/campaigns | implemented |
| Action modes/domain | mass_mailing/views/utm_campaign_views.xml: kanban,list,form, is_auto_campaign = False | SMS UTM campaign page with kanban/list and non-automatic datasource query | implemented |
| List/search | Campaign name, responsible, stage, tags, My Campaigns, Archived, stage/responsible/tag grouping | Search, active filter, group-by declarations and matching columns | implemented |
| Form/workflow | Stage statusbar, Campaign Name, Responsible, Tags, archive/restore, Mailings stat | sms-utm-campaign-detail OdooFormView with CRUD/archive/restore and /sms-campaigns navigation | implemented |
| Persistence | utm.campaign with mailing relationships and active state | sms_marketing_campaign_stages and sms_marketing_utm_campaigns, fixed migrations and row versions | implemented |
| Browser evidence | Authenticated live Odoo action required | Borrow timed out before the tab became session-controlled | blocked; no visual claim |
