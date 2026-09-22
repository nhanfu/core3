# Source comparison

| Concern | Odoo 19 source | Core3 implementation | Status |
| --- | --- | --- | --- |
| Menu/action | `mass_mailing_sms/views/mailing_sms_menus.xml` → Configuration → Link Tracker; `link_tracker.link_tracker_action` | `services/sms-marketing/manifest.yaml` → `/sms-link-trackers` | implemented |
| Modes | `link_tracker/views/link_tracker_views.xml`: `list,form,graph` | `pages/link-trackers.yaml` list/form/graph tabs | implemented |
| List fields | Create Date, tracked URL, title, target URL, label, clicks, UTM fields | `sms_link_trackers` datasource and list columns | implemented |
| Detail form | Website Link, Target Link, Page Title, Button label, Campaign/Medium/Source | `sms-link-tracker-detail` OdooFormView | implemented |
| Stats | Visit Page and Clicks (`action_visit_page`, `action_view_statistics`) | `visit_sms_link_tracker`, `view_sms_link_tracker_clicks` read actions | implemented |
| Persistence | `link.tracker` and generated short code | `sms_marketing_link_trackers`, migrations 013/014 | implemented |
| Guards | URL validation and unique URL/UTM/label combination | invalid URL, duplicate, missing, stale row-version, empty, transport contracts | implemented |
| Browser evidence | Authenticated Odoo desktop/mobile inspection required | Borrow timed out before tab access | blocked; no visual claim |
