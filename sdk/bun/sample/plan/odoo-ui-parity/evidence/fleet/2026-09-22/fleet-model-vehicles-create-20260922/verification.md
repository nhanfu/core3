# Verification

The YAML page/API contract was discovered and exercised through the focused
integration tests. The zero-vehicle Ranger Zero fixture starts at count 0;
the action creates Ranger Zero 01, inserts its model relation, initializes
the vehicle from the selected model, increments the model count, and survives
file-backed restart plus migration replay.

No browser screenshot or live Odoo comparison is claimed because the one
allowed BrowserSkill borrow was blocked by existing tab ownership.
