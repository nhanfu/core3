# Accounting menu/action inventory

Source: `/home/nhanjs/projects/odoo/addons/account/views/account_menuitem.xml`
and the `account` addon view/wizard XML files. This is the complete visible
menu tree declared by the supplied Odoo 19 Community addon; groups are retained
because they determine visibility.

## Visible menu tree

| Sequence | Menu path | Action XML ID | Visibility |
| --- | --- | --- | --- |
| 1 | Invoicing / Dashboard | `open_account_journal_dashboard_kanban` | `account.group_account_basic` |
| 2 | Invoicing / Customers / Invoices | `action_move_out_invoice` | parent Invoicing groups |
| 3 | Invoicing / Customers / Credit Notes | `action_move_out_refund_type_non_legacy` | parent Invoicing groups |
| 4 | Invoicing / Customers / Payments | `action_account_payments` | parent Invoicing groups |
| 5 | Invoicing / Customers / Products | `product_product_action_sellable` | parent Invoicing groups |
| 6 | Invoicing / Customers / Customers | `res_partner_action_customer` | parent Invoicing groups |
| 7 | Invoicing / Vendors / Bills | `action_move_in_invoice` | parent Invoicing groups |
| 8 | Invoicing / Vendors / Refunds | `action_move_in_refund_type` | parent Invoicing groups |
| 9 | Invoicing / Vendors / Payments | `action_account_payments_payable` | parent Invoicing groups |
| 10 | Invoicing / Vendors / Products | `product_product_action_purchasable` | parent Invoicing groups |
| 11 | Invoicing / Vendors / Vendors | `account.res_partner_action_supplier` | parent Invoicing groups |
| 12 | Accounting / Transactions / Journal Entries | `action_move_journal_line` | `account.group_account_readonly` |
| 13 | Accounting / Transactions / Analytic Items | `analytic.account_analytic_line_action_entries` | analytic accounting group |
| 14 | Accounting / Closing | no direct action in `account_menuitem.xml` | readonly group |
| 15 | Review / Control / Journal Items | `action_account_moves_all` | readonly group |
| 16 | Review / Logs | no direct action in `account_menuitem.xml` | readonly group |
| 17 | Reporting / Partner Reports | submenu populated by report modules | readonly/invoice groups |
| 18 | Reporting / Taxes & Fiscal | submenu populated by report modules | readonly/invoice groups |
| 19 | Reporting / Management / Invoice Analysis | `action_account_invoice_report_all` | readonly/invoice groups |
| 20 | Reporting / Management / Analytic Report | `action_analytic_reporting` | readonly group |
| 21 | Reporting / Statement Reports | submenu populated by report modules | readonly/basic groups |
| 22 | Configuration / Settings | `action_account_config` | `base.group_system` |
| 23 | Configuration / Accounting / Chart of Accounts | `action_account_form` | readonly group |
| 24 | Configuration / Accounting / Taxes | `action_tax_form` | manager group |
| 25 | Configuration / Accounting / Journals | `action_account_journal_form` | manager group |
| 26 | Configuration / Accounting / Reporting | submenu populated by report modules | readonly group |
| 27 | Configuration / Accounting / Currencies | `base.action_currency_form` | manager group |
| 28 | Configuration / Accounting / Fiscal Positions | `action_account_fiscal_position_form` | manager group |
| 29 | Configuration / Accounting / Multi-Ledger | `action_account_journal_group_list` | readonly group |
| 30 | Configuration / Accounting / Tax Groups | `action_tax_group` | `base.group_no_one` |
| 31 | Configuration / Accounting / Cash Roundings | `rounding_list_action` | cash-rounding group |
| 32 | Configuration / Invoicing / Payment Terms | `action_payment_term_form` | invoice/readonly groups |
| 33 | Configuration / Invoicing / Incoterms | `action_incoterms_tree` | `base.group_no_one` |
| 34 | Configuration / Invoicing / Product Categories | `product.product_category_action_form` | invoice/readonly groups |
| 35 | Configuration / Online Payments | submenu populated by payment modules | manager group |
| 36 | Configuration / Analytic Accounting / Analytic Distribution Models | `analytic.action_analytic_distribution_model` | analytic group |
| 37 | Configuration / Analytic Accounting / Accounts | `analytic.action_account_analytic_account_form` | analytic group |
| 38 | Configuration / Analytic Accounting / Plans | `analytic.account_analytic_plan_action` | analytic group |

## Relevant action/view inventory

The invoice action family uses these source-confirmed modes: `Invoices`,
`Credit Notes`, `Bills`, and `Refunds` are `list,kanban,form,activity`;
`Journal Entries` is `list,kanban,form,activity`; `Journal Items` is
`list,pivot,graph,kanban`; Payments are `list,kanban,form,graph,activity`;
and configuration catalogs use `list,kanban,form` or `list,form` as declared
in the addon XML. The invoice form is `account.move` and includes the
attachment-backed chatter contract.

The attachment-specific source action is not a standalone menu action. It is
the `account.move` form/chatter capability: `account_move_views.xml` declares
`<chatter reload_on_attachment="True"/>` and the model declares
`attachment_ids = fields.One2many('ir.attachment', 'res_id', domain=[('res_model', '=', 'account.move')], string='Attachments')`.
