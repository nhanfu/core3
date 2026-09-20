# Odoo source comparison

Source checkout: `/home/nhanjs/projects/odoo`, Odoo 19 Community product/stock
addons.

## Menu, action, and views

- `addons/stock/views/stock_menu_views.xml:20-27` places
  `product.product_category_action_form` under Inventory > Configuration >
  Products as **Categories**.
- `addons/product/views/product_category_views.xml:4-33` defines the form for
  `product.category`: Category name, Parent Category, a Products stat action,
  and chatter. Lines `35-55` define the hierarchical display-name list and
  name/parent search. Lines `57-63` define `product_category_action_form`,
  model `product.category`, path `product-categories`.
- `addons/product/models/product_category.py:8-55` defines the global category
  hierarchy, recursive `complete_name`, child relation, descendant-aware
  product count, and recursion constraint.

## Core3 mapping

Core3 maps this source surface to `inventory_product_categories`. The layout
contracts are `services/inventory/pages/product-categories.yaml` and
`pages/product-category-detail.yaml`; backend datasource/action contracts are
`api/product-categories.yaml` and `api/product-category-detail.yaml`, joined
by matching `page.id`. Migration `20260922000000-050-inventory-product-
categories.yaml` seeds a deterministic All/Furniture/Office hierarchy.

The list/detail queries compute complete hierarchical names and descendant
product counts from the durable category and variant tables. The detail Products
stat navigates to the existing Product Variants surface with a category filter.
Manager CRUD enforces required names, valid parents, duplicate sibling names,
cycle prevention, safe deletion for child/product use, and row-version
concurrency. Categories are global/shared as in the Odoo model; no invented
company ownership is applied.

Odoo's chatter stream and live category mutation remain outside this bounded
slice; Core3 CRUD and product drilldown are the implemented lifecycle.
