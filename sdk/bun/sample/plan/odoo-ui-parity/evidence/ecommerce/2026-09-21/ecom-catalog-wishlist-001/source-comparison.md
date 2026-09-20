# Source comparison

## Odoo

The supplied `website_sale_wishlist` addon defines `product.wishlist` with a
unique product/partner relation, website/pricelist/price metadata, active state,
and a current-list filter that excludes unpublished or non-sellable products.
Its controller exposes public JSON add, HTML list, JSON remove, and product-ID
routes. Anonymous records are held in the `wishlist_ids` session list; login
merges session items into the partner wishlist and removes duplicates. The
templates inject wishlist controls into product cards, product detail, and
cart “Save for Later” actions.

## Core3

Core3 migrations 062/063 add durable wishlist owner rows and item rows with a
unique `(wishlist, product, variant)` key. The separate page/API contract
lists only active published products, scopes customer rows by company/email,
and guards add/remove with ownership, company, active product/variant,
optimistic row-version, and deterministic idempotency behavior. Anonymous
public routes use an HttpOnly wishlist cookie and call the declared YAML
public actions/operation. Only product/variant metadata and saved price are
stored; no payment or secret data is involved.
