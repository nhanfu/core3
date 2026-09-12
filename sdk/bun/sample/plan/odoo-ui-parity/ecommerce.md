# eCommerce parity — Products slice

Status: ready for review (bounded wave 2 slice)

## Source trace

Reference: Odoo 19 `website_sale` addon in `/home/nhanjs/projects/odoo/addons/website_sale`.
`views/website_sale_menus.xml` defines `Website > Configuration > eCommerce`
(salesman group, sequence 20), with `Orders` (sequence 2) and `Products`
(sequence 3). Products contains Products, Pricelists, Categories, Attributes,
Combo Choices, Product Tags, and Product Ribbons; group-gated entries are
preserved in the trace. This batch implements only Products.

The implemented entry is `menu_catalog_products` →
`product_template_action_website` in `views/product_views.xml`: action path
`ecommerce-products`, model `product.template`, view modes
`kanban,list,form,activity`, default Published filter, and website-specific
sequence ordering. The Core3 deliberate route alias is `/ecommerce/products`;
the exact action and menu labels remain visible in the Core3 eCommerce menu.

The same source file adds the website list columns for website sequence,
Categories, and Is Published. Core3 renders these alongside Product, Internal
Reference, Product Type, and Sales Price. The page is presentation-only and
joins `api/products.yaml` by `page.id`; permissions, queries, mutations, and
fixtures stay in the backend API/migration seam.

## Acceptance and evidence

- Deterministic products: three published/one unpublished fixtures, ordered by
  website sequence; search, Published filter, empty state, and transport error
  state are declared and tested.
- `ecommerce.read` gates the page and query; `ecommerce.write` gates create and
  archive. Blank names and duplicate internal references are rejected.
- Visible Kanban/List tabs are used; mobile defaults to Kanban to match the
  Odoo action's product-first catalog surface. New, Archive, search, filter,
  row navigation, empty, and error states are covered by the page/API contract.
- Required comparison captures were attempted under
  `/tmp/core3-odoo-parity/ecommerce-products-wave2/` for Odoo and Core3 at
  1440x900 and 390x844. On 2026-09-12 Odoo responded at `http://localhost:8073`
  (`/web/login` HTTP 200), but authenticated capture was not completed because
  the available browser automation runtime was unavailable in this session.
  Core3 capture was blocked before authentication: `bun run dev --db=ddb
  --memory` left the backend without a listener while Vite proxied to it
  (`ECONNREFUSED 127.0.0.1:3001`, then an explicit retry hit a stale mediator
  on 3012). After cleanup, the backend exited during YAML catalog loading on
  the unrelated pre-existing `sms_marketing.mailings.cancel` contract:
  `Named action sms_marketing.mailings.cancel permission does not match its
  workflow transition` in `packages/server/src/routes/yaml-api.ts:253`.
  No screenshot files were created and no visual-parity claim is made. Retry
  after repairing that baseline action and assigning distinct backend,
  frontend, and mediator ports.
