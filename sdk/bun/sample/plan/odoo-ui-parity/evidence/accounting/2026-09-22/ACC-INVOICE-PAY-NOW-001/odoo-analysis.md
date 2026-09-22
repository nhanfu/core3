# Odoo analysis

- Addons: Odoo 19 Community `account`, `payment`, and `portal`.
- Local source: `addons/payment/controllers/portal.py`,
  `PaymentPortal.payment_pay`.
- The source route is `GET /payment/pay`, public and website-enabled. It
  validates the partner access token when a partner is supplied, resolves the
  company/currency, selects compatible providers/methods/tokens, and renders a
  payment form with `transaction_route: /payment/transaction` and
  `landing_route: /payment/confirmation`.
- The Odoo `account.move.preview_invoice` page evidence already captured in
  `ACC-INVOICE-PREVIEW-001` shows `Pay Now` on the posted customer invoice
  portal preview at desktop and mobile sizes. The live tab could not be
  borrowed again for this feature because another BrowserSkill session owned
  it; see `browser-check.md`.
