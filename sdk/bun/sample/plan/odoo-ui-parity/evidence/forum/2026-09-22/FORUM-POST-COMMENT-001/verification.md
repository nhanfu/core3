# Verification

The post-comment contract is functionally complete within the bounded slice.
Page and API YAML remain separate and joined by `page.id`. Comments are
durable, reload-safe, permissioned, target-validated, and update parent
activity/version state in the same mutation transaction.

No visual parity or full Forum sign-off is asserted. The Odoo reference
database has no installed `website_forum` addon, so its Forum comment surface
does not exist for comparison; deletion, conversion, karma, notifications, and
full public rendering remain open gaps.
