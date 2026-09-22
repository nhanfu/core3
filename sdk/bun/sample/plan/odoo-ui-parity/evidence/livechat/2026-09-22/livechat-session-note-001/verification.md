# BrowserSkill verification

- BrowserSkill daemon: connected shared Chrome instance `245ea108`.
- Existing authenticated Odoo tabs were listed. The Discuss tab was already
  borrowed by another session; borrowing the available Odoo POS tab timed out
  during the required extension confirmation. No credentials, cookies, or
  tokens were read.
- An agent-owned BrowserSkill tab navigated to
  `http://localhost:8069/im_livechat/support/1` and observed Odoo Error 404 at
  1916x833 desktop and emulated 390x844 mobile viewport states.
- Blocker captures are outside Git:
  `/tmp/odoo-livechat-session-note-blocker-desktop-20260922.png`
  `/tmp/odoo-livechat-session-note-blocker-mobile-20260922.png`
- Result: no authenticated Odoo/Core3 visual comparison and no visual-parity
  claim. The BrowserSkill sessions were stopped after the probe.
