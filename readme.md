# ERP Rendering Framework

A TypeScript library for building ERP interfaces. YAML-driven components, embedded SQL, OOP rendering, full CRUD, and custom scripting — shipped as two packages (`@core3/backend`, `@core3/frontend`) that client projects install and configure.

## Packages

```
@core3/frontend    — YAML→JSON parser, component tree, BaseComponent, html.js, Tailwind
@core3/backend     — repository pattern, CRUD engine, scripting sandbox, auth interface, protocols
```

Client projects install both and register their YAML folders and custom component implementations.

## How it works

```
YAML page files (client project)
        │
        ▼  parsed at runtime
      JSON
        │
        ▼  build component tree
  BaseComponent tree
        │
        ▼  call draw() on root, passing each node its container
      DOM (html.js + Tailwind)
```

1. Client registers YAML folders via `framework.registerPages("./pages")`
2. Framework parses YAML → JSON at runtime
3. JSON is walked to build the component tree — each node becomes a `BaseComponent` instance
4. `draw()` is called top-down, passing the current node its DOM container
5. Data flows: server sends flat 1D array → components render → user events → page-level handler → `submit()` → server

## Core concepts

**Server-first data** — server does all JOINs/lookups, returns a flat 1D array. Frontend never resolves references.

**Components, not columns** — GridView children are real `BaseComponent` instances (`TextCell`, `BadgeCell`, etc.) in the virtual tree with state, traversal, and `submit()`.

**Page-level event handler** — single class per page, inherits `BaseComponent`, handles all interactions. After CRUD: `this.closest('grid-view').redraw()` to re-fetch and re-render.

**Full CRUD** — `crud: true` for auto-generated mutations, or custom functions per operation. Mix and match.

**TypeScript interfaces** — all built-in components expose interfaces so client code can register alternative implementations.

## Quick example

```yaml
# pages/purchase-orders.yaml (lives in client project)
page:
  title: Purchase Orders
  events:
    class: POPageEvents
    handles:
      - target: po-grid
        on: [cellClick, rowSelect]

components:
  - type: GridView
    id: po-grid
    source: purchase-orders
    components:
      - type: TextCell
        id: po-number
        field: po_number
        label: PO #
      - type: BadgeCell
        id: status
        field: status_label
        color: status_color

datasources:
  - id: purchase-orders
    db: postgres
    table: purchase_orders
    crud: true
    query: |
      SELECT po.id, po.po_number,
             v.name AS vendor_name,
             s.label AS status_label, s.color AS status_color,
             po.total
      FROM purchase_orders po
      JOIN vendors v ON v.id = po.vendor_id
      JOIN po_status_codes s ON s.code = po.status
      ORDER BY po.created_at DESC
```

## Tech stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript |
| DOM | html.js (wrapped in OOP component model) |
| CSS | Tailwind CSS (default, YAML-overridable) |
| Config | YAML → JSON at runtime |
| Server | Node.js / Bun |
| Databases | PostgreSQL, SQL Server, SQLite, DuckDB |
| Scripting | JS, TS, Python, Lua, Shell (sandboxed) |
| Auth | Pluggable interface (host app provides impl) |
| Protocols | HTTP, WebSocket, SSE, gRPC |

## Specification

Open [`/spec/main.html`](/spec/main.html) for the full interactive spec with architecture diagrams, code samples, and API details.
