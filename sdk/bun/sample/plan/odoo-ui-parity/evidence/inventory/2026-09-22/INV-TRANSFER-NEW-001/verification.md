# Verification

The live authenticated Odoo overview was inspected with bsk on browser
instance `245ea108` using an agent session. Desktop accessibility output
reported `1916x833`; the overview screenshot is `odoo-overview-desktop.png`.
The same route was checked with iPhone-14 emulation and accessibility output
reported `390x844`. The New menu item did not open the New Transfer form, and
the direct generated action route displayed the generic Odoo error modal.

The Core3 module runtime was attempted with the Inventory module runner. It
failed during global YAML discovery before binding a route because an
unrelated page has invalid graph/activity view schema. Consequently there are
no authenticated Core3 desktop/mobile captures and no visual parity claim.

The bsk session was stopped after the browser checks. No credentials, cookies,
or tokens are stored in this evidence.
