# Odoo source analysis

- Source: `/home/nhanjs/projects/odoo/addons/mrp/views/mrp_workorder_views.xml`
- Stable action: `action_mrp_workorder_production`
- Name/model: Work Orders Planning / `mrp.workorder`
- Path: `production-planning`
- Modes: `list,form,calendar,pivot,graph`
- Domain: `production_state not in ('done', 'cancel')`
- Context defaults: Manufacturing Order grouping plus Ready, Blocked, and In Progress search filters
- Empty help: “No work orders to do!” and the explanation that work orders are operations belonging to a manufacturing order.
- Menu: no standalone menu reference in the local MRP source; the MRP Planning parent is a scheduler/server-action surface.

Current Core3 had global Work Orders and Work Center-scoped actions, but no
production-planning route or datasource.
