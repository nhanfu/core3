# EMP-EMPLOYEE-ORG-CHART-001 browser evidence blocker

Date: 2026-09-22

BrowserSkill instance `245ea108` was connected and the task-owned session was
started as `jftr`. The existing authenticated Odoo user tab was listed as
`1770662590`. Borrowing it returned the exact daemon error:

> tab is borrowed by another session
>
> hint: return the tab from the borrowing session via `bsk tab return <tab-id> --session <id>` or stop that session
>
> details: tab_borrow: tab 1770662590 is already borrowed or being borrowed by session zqun

The owning session was active and was not controlled by this task, so the tab
was not force-returned and no independent login or Playwright session was
created. No Odoo or Core3 desktop/mobile screenshots were captured. Required
recapture states after the tab is returned: Odoo Employees list/form with the
Work tab organization chart at 1440x900 and 390x844, plus the corresponding
authenticated Core3 employee detail states, direct-report drilldown, and empty
leaf state. This slice makes no visual-parity claim.
