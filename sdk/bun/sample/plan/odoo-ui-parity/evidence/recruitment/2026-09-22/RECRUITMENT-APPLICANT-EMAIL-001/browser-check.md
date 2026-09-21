# Browser and reference check

BrowserSkill/bsk was used after reading the browser skill instructions. Browser
instance: `245ea108`. The authenticated Core3 desktop route rendered the
Applicants list and the Send Email composer. The bsk session was stopped at
finalization.

The authenticated Odoo reference was tested at
`http://localhost:8069/odoo/recruitment?db=core3_reference` at desktop
1440x900 and mobile 390x844. Both attempts showed the Discuss/OdooBot shell
without a Recruitment launcher or Recruitment action. Therefore the source
feature could not be inspected live and paired visual parity is blocked.

Blocker captures:

- desktop: `/tmp/core3-odoo-parity/recruitment-send-email-2026-09-22/odoo-reference-blocker-desktop-1440x900.png`, SHA-256 `b8655837d827f6ce56f79d451717c66d2d57ba9448672601f6f6511a5b48d3c3`
- mobile: `/tmp/core3-odoo-parity/recruitment-send-email-2026-09-22/odoo-reference-blocker-mobile-390x844.png`, SHA-256 `e8f1d213fd00d860a068f7e208323ac285f9f355cbd7ca5349b47aa7e91b2621`

No password, cookie, or token was recorded.
