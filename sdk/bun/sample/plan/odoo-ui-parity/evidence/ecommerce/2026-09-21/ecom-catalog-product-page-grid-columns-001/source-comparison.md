# Source comparison

- Odoo model: `website.product_page_grid_columns` defaults to `2`.
- Odoo builder action: `ProductPageImageGridColumnsAction` has static id
  `productPageImageGridColumns`, updates the preview `data-grid_columns`, and
  persists `product_page_grid_columns` through `/shop/config/website`.
- Odoo builder choices: `product_page_option.xml` exposes exactly 1, 2, and 3
  columns under the Grid configuration.
- Odoo rendering: the product image grid emits
  `data-grid_columns="website.product_page_grid_columns"`, iterates that
  value, and distributes product images across the selected columns.
- Core3 mapping: migrations 148/149 persist the company-scoped policy;
  `api/product-page-grid-columns-policy.yaml` and
  `pages/product-page-grid-columns-policy.yaml` join through
  `ecommerce-product-page-grid-columns-policy`; Product Detail reads the
  effective policy through `ecommerce_product_page_grid_columns`.
