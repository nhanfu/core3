# Live Chat Invite People — bounded evidence

Stable feature ID: `LIVECHAT-INVITE-PEOPLE-001`.

The source action is Odoo Live Chat's `invite-people` thread action. The Live
Chat patch keeps it available only while a live chat is open, and the shared
Discuss invitation dialog calls `discuss.channel.add_members`. Core3 implements
the bounded operator equivalent on session detail with a durable member roster,
operator selection, invitation notification, and assigned-operator, closed,
duplicate, missing, and stale guards.

BrowserSkill blocker: the authenticated Odoo tab `1770662590` was present on
shared browser instance `245ea108`, but borrowing it from BrowserSkill session
`wabp` timed out after the extension confirmation wait. No second borrow was
attempted, no independent browser/login was used, and no credentials were
read. Therefore no authenticated Odoo desktop/mobile capture was produced and
no visual-parity claim is made.

Expected follow-up captures, if the shared tab can be borrowed, are:

- `/tmp/odoo-livechat-invite-people-desktop-1440x900-20260922.png`
- `/tmp/odoo-livechat-invite-people-mobile-390x844-20260922.png`
- `/tmp/core3-livechat-invite-people-desktop-1440x900-20260922.png`
- `/tmp/core3-livechat-invite-people-mobile-390x844-20260922.png`
