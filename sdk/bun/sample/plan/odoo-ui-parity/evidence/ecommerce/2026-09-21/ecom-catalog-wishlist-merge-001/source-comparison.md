# Source comparison

## Odoo

The supplied `website_sale_wishlist/models/product_wishlist.py` method
`_check_wishlist_from_session()` loads the `wishlist_ids` session records,
compares their products with the partner wishlist, unlinks duplicates, writes
the partner on remaining records, and removes the session key. The supplied
`models/res_users.py` login hook calls this method when a session wishlist is
present.

## Core3

Core3 keeps the existing durable anonymous/customer wishlist model and adds a
separate API mutation with `permission: ecommerce.write` and
`action: ecommerce.wishlist.merge_session`. It checks the current company,
customer company, anonymous session owner, distinct source/target IDs, and the
expected source row version. The mutation inserts a missing customer owner,
copies only active published products with a unique wishlist/product/variant
key, removes the consumed session rows, and does not increment the target on a
replay after the source has already been consumed.

The API and wishlist page remain separate YAML contracts joined by
`page.id: ecommerce-wishlist`. The action is an Ecommerce-owned login-boundary
contract; changing the shared auth listener is outside this module slice.
