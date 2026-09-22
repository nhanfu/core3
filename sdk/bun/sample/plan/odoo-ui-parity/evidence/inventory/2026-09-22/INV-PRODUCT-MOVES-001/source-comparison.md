# Source comparison

## Odoo 19

- `addons/stock/views/product_views.xml:498-513` declares the Product form stat button `action_view_stock_move_lines`, restricted to stock users and hidden for non-consumable products. It displays incoming and outgoing move counts.
- `addons/stock/models/product.py:1242-1246` returns `stock.stock_move_line_action` with domain `product_id.product_tmpl_id in self.ids`, so the action includes all variants of the selected template.

## Core3 before this slice

- `services/inventory/pages/product-template-detail.yaml` exposed Product, Variants, and Update Quantity, but no Stock Moves stat action.
- `services/inventory/pages/moves.yaml` and `api/moves.yaml` already provided the durable read-only Moves History list/detail surface, but had no product-template context filter.

## Core3 after this slice

- `pages/product-template-detail.yaml` adds `view_inventory_product_template_moves` as an `inventory.read` Stock Moves stat button.
- `api/product-template-detail.yaml` exposes a deterministic `move_count` and navigates to `/moves?product_template_id=<template id>`.
- `api/moves.yaml` filters through `inventory_product_template_move_links`, preserving the existing list, search, status, movement, date, empty, and transport-error behavior.
- Migration `20260923010000-091-inventory-product-move-history.yaml` seeds three stable same-company template/move relations and is replay-safe.
