# Odoo analysis

Odoo 19 `action_website_configuration` opens the Website settings form. In the
General block, the `Website Identification` setting describes the browser-tab
identity and exposes editable `website_name` and binary `favicon` fields. The
favicon field uses the `image` widget. `res.config.settings.favicon` is a
writeable related field to `website_id.favicon`; `website._handle_favicon`
normalizes uploaded image bytes to a centered 256x256 ICO before persistence.

The implementation is intentionally bounded to the visible upload/replace
control and durable Website-scoped bytes. Odoo's image-processing conversion is
represented by validated image input and durable source bytes; no Odoo frontend
code is copied.
