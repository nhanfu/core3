# ECOM-REPORT-ONLINE-SALES-ANALYSIS-001 source comparison

## Odoo 19

- Addon: `/home/nhanjs/projects/odoo/addons/website_sale`.
- Menu: `website_sale/views/website_sale_menus.xml:113-117`, Reporting →
  Online Sales.
- Action: `website_sale/report/sale_report_views.xml:75-90`,
  `sale_report_action_dashboard`, label “Online Sales Analysis”, model
  `sale.report`, `pivot,graph`, domain `website_id != False`, and default
  Confirmed Orders filter.
- Search/pivot/graph: the same XML defines date/product/category/customer/
  country/company search fields, matching group-bys, order-date grouping, a
  date-row/status-column pivot with `price_subtotal`, and a date/revenue graph.
- Model extension: `website_sale/report/sale_report.py` adds `website_id` and
  website-specific report fields to the read-only SQL report model.

## Core3 before this slice

No eCommerce Reporting group, Online Sales Analysis page, or eCommerce sales
analysis datasource existed. The nearest existing order-service reports are
Sales Analysis reports over the separate `orders`/`order_lines` model and are
not the Website Sale action or eCommerce menu contract.

## Core3 after this slice

`services/ecommerce/pages/online-sales-analysis.yaml` owns the rendered page;
`services/ecommerce/api/online-sales-analysis.yaml` owns the durable query and
error contracts; both use `page.id: ecommerce-online-sales-analysis`. The
report reads the existing checkout-backed `ecommerce_orders` and
`ecommerce_order_lines` tables. Core3 has one website and no persisted country
on these report rows, so the report projects `Core3 Website` and `Unknown`
explicitly rather than claiming multi-website or country data that is not
stored.
