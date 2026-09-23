# Test results

Command:

```text
bun test ./test/website_public_cookie_consent.integration.test.ts --timeout 20000
```

Result:

```text
4 pass
0 fail
22 expect() calls
```

The test reads the local Odoo template and interaction source, exercises the
YAML-backed Website operations through the real `WebsiteModule` public route,
checks all/essential replay, and covers malformed, missing-site, disabled-bar,
validation, and method boundaries.
