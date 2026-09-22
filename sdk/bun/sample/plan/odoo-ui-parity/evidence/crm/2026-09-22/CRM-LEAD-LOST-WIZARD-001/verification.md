# Browser verification

BrowserSkill was used as required on shared browser instance `245ea108`.
Daemon status was healthy (`bsk 0.3.0`, protocol `1.3`). A session was started
without focusing the user's window and the user tab list was inspected.

The intended authenticated Odoo tab was:

- tab: `1770662590`
- title: `Acme Corporation`
- URL: `http://localhost:8069/odoo/contacts/9`

Borrow command:

```text
BSK_AUTO_START=0 bsk tab borrow 1770662590 --session sfkc --timeout 20s
```

Exact result:

```text
error: timed out waiting for human confirmation
hint: report the blocked step; do not automatically repeat the request or switch browser tools
details: Timed out waiting for tab borrow confirmation
```

The session was stopped cleanly with `bsk session stop sfkc`. The tab was not
borrowed, so no remote Odoo action was read or manipulated and no desktop or
mobile screenshot was captured. Core3 browser verification was not attempted
through another backend. This is a blocker, not a visual-parity pass.
