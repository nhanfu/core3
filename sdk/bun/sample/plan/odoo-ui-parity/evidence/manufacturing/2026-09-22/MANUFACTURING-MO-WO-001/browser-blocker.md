# BrowserSkill blocker

- Browser instance: `245ea108`
- Daemon: healthy, BrowserSkill 0.3.0 / protocol 1.3.
- Existing signed-in Odoo tab: `1770662590` (`Acme Corporation`,
  `http://localhost:8069/odoo/contacts/9` before this probe).
- Owned session: `mgnu`.
- Operation: `bsk tab borrow 1770662590 --session mgnu --timeout 120s`.
- Result: rejected immediately with `tab is borrowed by another session`,
  hinting that active session `olvm` owns the tab.
- Cleanup: `bsk session stop mgnu` was run. No navigation, independent login,
  credential/cookie/token access, or reference-database reset occurred.

The accompanying desktop/mobile PNGs are reused blocker-state captures from
the same authenticated shared profile and are explicitly not action captures.
No Odoo visual-parity claim is made.
