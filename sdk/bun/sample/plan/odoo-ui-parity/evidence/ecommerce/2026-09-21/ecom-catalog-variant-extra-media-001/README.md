# ECOM-CATALOG-VARIANT-EXTRA-MEDIA-001 evidence

Bounded Ecommerce slice: Website Sale product-variant extra image media.

- Odoo source: `product.image.product_variant_id`,
  `product_variant_image_ids`, the “Extra Variant Media” form viewer, and the
  selected-variant carousel response.
- Core3 contracts: `services/ecommerce/pages/product-variant-detail.yaml` and
  `services/ecommerce/api/product-variant-detail.yaml`, joined by
  `page.id: ecommerce-product-variant-detail`; Product Detail opens this page
  from variant rows.
- Durable schema/data: migrations 074/075 add variant-scoped image metadata and
  a deterministic Mug Blue fixture.
- Focused proof: `test/ecommerce_product_variant_images.integration.test.ts` —
  3 tests, 33 assertions; adjacent Product Detail, Variant, and Cart tests
  bring the bounded set to 14 tests and 104 assertions.
- Core3 authenticated desktop/mobile and Odoo paired rendering are blocked as
  recorded in `browser-check.md`; no UI sign-off is claimed.

Video URLs and external media transformation are outside this image-only slice.
This is a bounded verified slice, not Ecommerce module sign-off.
