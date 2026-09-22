# Project Share Project — evidence

Feature: PROJECT-SHARE-PROJECT-001.

This bounded slice implements the missing Odoo Project form Share Project
action as a manager-only Core3 server_form. The page remains presentation
only and the matching API fragment is joined through page.id: project-detail.
A durable project_shares table records normalized collaborator email, access
mode, invitation intent, active state, row version, and a deterministic
portal-detail link.

The scope is deliberately bounded: it records guarded share access but does
not claim email delivery, portal-user provisioning, collaborator removal, or
the full Odoo project-sharing controller/client.

Live authenticated comparison was blocked. BrowserSkill instance 245ea108
reported Odoo tab 1770662590 already borrowed by session olvm; an alternate
user tab borrow waited 30 seconds without extension confirmation. No captures
were produced and no visual, responsive, authenticated, or paired-Odoo parity
claim is made.
