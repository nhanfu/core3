# Comparison and blockers

The implementation follows Odoo's `hr.employee.skill` model and Work-tab
`skills_one2many` interaction, including catalog-dependent category/skill/level
selection, regular-skill duplicate protection, validity, and archive behavior.

Core3 authenticated switching works, but the deterministic fixture company
does not match the authenticated company, so the guarded route correctly
shows no populated employee or skill rows. Odoo authentication and Work-tab
navigation work, but the selected reference employee has no rendered populated
Skills widget. These are evidence blockers, not passes. Seven app-icon 404s
are unrelated shell noise.
