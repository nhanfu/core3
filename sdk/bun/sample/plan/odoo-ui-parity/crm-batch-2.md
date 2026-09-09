# CRM parity batch 2: activities and lead detail collaboration

Status: `implemented`

This batch extends the batch-1 activity/chatter contracts into a usable My
Activities workflow. It does not duplicate the pipeline, lead workflow, or
existing lead-detail mutations.

## Scope and source contract

The source-defined Odoo action is `crm.crm_lead_action_my_activities` from
`/home/nhanjs/projects/odoo/addons/crm/views/crm_menu_views.xml`. Its expected
surface is an activity-oriented queue with due-state filters and access to the
related lead form. The live authenticated Odoo addon is still uninstalled on
2026-09-10: CRM is absent from the home menu and `/odoo/crm` redirects to
Discuss. No Odoo visual or row-level evidence is claimed, and the Odoo
database was not changed. Comparison is against the source-defined action and
lead/chatter contracts only.

## Implemented Core3 group

- `crm-activities` / `/crm-activities`: deterministic overdue, today, and
  upcoming fixtures; activity-type and timing filters; queue-level scheduling;
  double-click and row-menu navigation to activity detail.
- `crm-activity-detail` / `/crm-activity-detail`: CRM-owned activity detail
  form, related opportunity drill-down, and guarded completion.
- Completing from the queue or detail records `crm.activities.complete` in the
  lead timeline, preserving chained follow-up creation.
- Scheduling accepts only active activity types and open CRM leads. All data
  stays in the CRM service database; no Base or Order table is queried.

## Evidence contract

Authenticated Core3 evidence records the user, route, page ID, fixture state,
and viewport. Desktop and mobile screenshots are written to `/tmp` and are
not source artifacts. The Odoo screenshots in the parity plan remain invalid
for sign-off while the addon is uninstalled.

Focused integration coverage asserts page/API fragment joins, route actions,
closed-lead scheduling rejection, completion timeline logging, and the CRM
migration chain. Full catalog audit limitations are reported separately if
the repository's existing AI catalog consistency failures remain.
