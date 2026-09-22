# BASE-CONTACT-HIERARCHY-CHILDREN-001

Bounded Base/Contacts slice for the Odoo `res.partner.child_ids` relation in
the contact form’s Contacts notebook. Core3 adds a durable related-contact
list with guarded create/edit/delete actions while preserving page/API YAML
separation through `page.id: contact-detail`.

Contract, restart, Base regression, audit, frontend build, and diff checks
passed. BrowserSkill could not borrow the shared signed-in Odoo Contacts tab,
so this evidence intentionally contains no screenshots and makes no visual
parity claim.
