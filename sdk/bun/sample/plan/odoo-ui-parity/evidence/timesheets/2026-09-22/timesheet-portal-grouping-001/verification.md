# Browser verification

The bsk browser session used the authenticated Odoo reference on browser
instance `245ea108`, database `core3_reference`, and the existing QA session.

- Desktop `groupby=project_id`: group header and total captured in
  `odoo-project-desktop.png`.
- Desktop `groupby=parent_task_id`: `No Parent Task` group and total captured
  in `odoo-parent-desktop.png`.
- iPhone 14 emulation `groupby=parent_task_id`: responsive group header/table
  captured in `odoo-parent-mobile.png`.
- Core3 navigation to `http://localhost:4001/my/timesheets` returned
  `ERR_CONNECTION_REFUSED` because the module server failed discovery before
  opening port 4001. No Core3 screenshot or visual sign-off is claimed.
