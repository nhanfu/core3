# Verification

Core3 contract and persistence verification passed as recorded in
`test-results.md`. The page/API pair was discovered in an isolated temporary
Manufacturing-only apps root, so the shared Surveys parse failure did not mask
the feature contract.

Browser verification was intentionally recorded as a blocker. With bsk
session `nmok` on instance `245ea108`, navigating to
`http://localhost:8069/odoo/work-centers` resulted in Discuss/OdooBot at
desktop and mobile. The desktop capture is 1916x833 and the mobile capture is
390x844 after `iphone-14` emulation. Neither is a Manufacturing screen and
neither is claimed as visual parity evidence.

The exact screenshots and SHA-256 values are:

| Capture | Path | SHA-256 |
| --- | --- | --- |
| Odoo desktop blocker | `odoo-desktop-blocker.png` | `4997a976def690384f13c8888d28ad0b99e953041672fd78dfad3ee5fdac149a` |
| Odoo mobile blocker | `odoo-mobile-blocker.png` | `6a90dd3a1c957a9d7618fd61b196744b2329c610ef478347f63faef9bd84a85a` |

No credentials, cookies, or tokens were extracted. No fresh Odoo
Manufacturing visual sign-off is possible until the shared reference profile
has access to the installed MRP module/database.
