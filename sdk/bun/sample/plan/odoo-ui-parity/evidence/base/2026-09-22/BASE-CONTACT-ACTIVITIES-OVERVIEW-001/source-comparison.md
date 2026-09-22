# Source comparison

- Odoo 19 `addons/mail/views/mail_activity_views.xml`: `mail_activity_action`
  is `Activity Overview` with list/form views; its search exposes linked
  record/summary, user, activity type, deadline, and Done filters, and its list
  exposes Done, Cancel, Today, Tomorrow, and Next Week actions.
- Odoo 19 `addons/mail/views/mail_menus.xml`: the Activities menu points to
  `mail_activity_action`.
- Core3 `pages/activities.yaml` is layout-only. `api/activities.yaml` owns
  reads, filters, mutations, permissions, and navigation. `pages/activity-workflow.yaml`
  owns the planned/done state contract. `api/activity-detail.yaml` owns the
  detail datasource and edit/navigation actions.
