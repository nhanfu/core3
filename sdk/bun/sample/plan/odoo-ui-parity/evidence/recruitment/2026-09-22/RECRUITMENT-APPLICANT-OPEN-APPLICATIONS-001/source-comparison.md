# Source comparison

Odoo source revision: `659759969d535d286b656c96b675e4612b925ddd`.

Odoo `action_open_applications` opens `hr.applicant` with `list,form` views,
`active_test=False`, a default stage search, and a domain built from the
current applicant's email, phone, LinkedIn, and pool linkage. The applicant
form binds the action to an Applications stat button and hides it when there
is no relevant application count.

Core3 preserves the bounded contract through a read-only related-applications
page. The datasource includes archived rows, derives a visible application
status, matches email/phone/pool links, excludes pool profiles, and applies the
active company boundary. Each row returns to the existing applicant detail.
Odoo's full chatter, attachments, LinkedIn normalization, and calendar/client
action runtime remain outside this slice.
