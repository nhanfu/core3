# Odoo analysis

- Addon: Odoo 19 Community `account`.
- Local source: `addons/account/models/account_move.py`, `preview_invoice`.
  The method returns `ir.actions.act_url`, `target: self`, and
  `url: self.get_portal_url()`.
- Form source: `addons/account/views/account_move_views.xml`, where the
  `Preview` object button is visible for posted customer invoices/credit notes
  and hidden for draft/cancelled/vendor documents.
- Authenticated reference: `http://localhost:8069/odoo/invoicing/10`, database
  `core3_reference`, browser instance `245ea108`.
- Observed preview page: `This is a preview of the customer portal.`, Back to
  edit mode, invoice breadcrumb/total, Pay Now, Download, invoice HTML iframe,
  and Communication history. On mobile Preview is in the overflow menu.
