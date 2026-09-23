# Browser evidence and blocker

BrowserSkill status was healthy: daemon PID `21391`, browser instance
`245ea108`, extension protocol 1.3. A task-owned session navigated to
`http://localhost:8069/odoo?db=core3_reference`, reached the authenticated
Employees action, observed the Group By menu's Tags option, and captured:

- `odoo-desktop-tags-group.png`: 1916x833.
- `odoo-mobile-tags-group.png`: 390x844 with `iphone-14` touch emulation.

The BrowserSkill session was stopped and mobile emulation was cleared. No
credentials, cookies, or tokens were accessed or stored.

Core3 blocker: `ss -ltnp` found no listener on the checked local development
ports `3000, 3001, 4000, 5173, 8080, 8787, 3002`, so an authenticated Core3
BrowserSkill capture could not be attempted. This is an evidence blocker, not
a visual-parity pass.
