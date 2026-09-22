# Permission results

- Page and read datasources require `manufacturing.read`.
- Operator transitions require `manufacturing.write` and the existing durable
  `mrp_workorders` workflow guards.
- No create or delete action is declared for this Odoo action.
- Odoo visual permission/browser evidence is unavailable because the required
  signed-in tab was already borrowed by another BrowserSkill session.
