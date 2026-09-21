# BASE-CONTACT-FOLLOWERS-001

Bounded Odoo 19 Base/Contacts feature: durable contact chatter followers.

## Source comparison

- Odoo route: authenticated Contacts contact form, `/odoo/contacts/73`.
- Odoo source: `addons/mail/views/res_partner_views.xml:18` (`<chatter/>`)
  and `addons/mail/static/src/chatter/web/chatter.xml:12-25`.
- Odoo behavior observed: follower count/tool, `Send message`, `Log note`,
  recipient chip, attachment tool, and responsive composer layout.
- Core3 page: `/base/contacts/detail?id=contact-demo`.
- Core3 API: `services/base/api/contact-detail.yaml`.
- Core3 migration: `services/base/migrations/20260921100000-020-contact-followers.yaml`.

## Verification

- Focused test: `bun test ./test/base_contact_chatter.integration.test.ts`
  — 3 passed, 24 assertions.
- Odoo desktop: `/tmp/odoo-base-contact-chatter-desktop-20260921.png`,
  SHA-256 `7d6b807af051bdf93f85dc296b21542b9a6ae0981bf72ee87723d824659d83bb`.
- Odoo mobile: `/tmp/odoo-base-contact-chatter-mobile-20260921.png`,
  SHA-256 `22266a8fb4899a8a9133a79b18a6cbb3467b6dc38d6259e668d3d1af2e0c9e74`.
- Odoo mobile follower menu: `/tmp/odoo-base-contact-followers-mobile-20260921.png`,
  SHA-256 `a1a72c50aeb5aff247ee8e5c0739f59844923296139d07e084859b582f6f7bc6`.

Core3 authenticated browser capture was blocked before page rendering by the
unrelated existing discovery error
`components[0].filters[6].options[0].id must be a non-empty string` in another
module. This evidence does not claim Core3 visual parity.
