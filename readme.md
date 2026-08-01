# ERP Rendering Framework

A shared TypeScript framework for processing client YAML and rendering ERP pages. The framework provides YAML-driven components, embedded SQL, OOP rendering, CRUD, and controlled extension points through direct imports from `apps/lib`.

## Vision

Core3 aims to be a YAML-driven software framework. YAML should be used throughout development so that client projects can progressively describe their complete systems declaratively, with as little handwritten client code as possible.

The intended scope of YAML includes:

- page layout and composition
- design-system and UI decisions
- business logic and workflows
- database management, including partitioning and sharding
- deployment and operational configuration

The repository’s [`apps/lib`](apps/lib) directory is a shared, client-agnostic library. It should process client YAML and provide generic rendering and framework capabilities; it must not become a home for business logic, domain models, or customer-specific behavior. [`apps/tms`](apps/tms) is the sample client project where those declarations and any remaining app-specific code live.

Other code remains possible when YAML cannot yet express a requirement, but it should be minimal transitional glue with a path toward a YAML-based solution.

## Packages

```
apps/lib            — YAML processing, page rendering, components, runtime, backend primitives, and interfaces
```

Client projects import the shared framework source directly and provide their YAML and app-specific integration.

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
| Scripting | YAML-declared source compiled to WebAssembly with explicit capabilities |
| Auth | Pluggable interface (host app provides impl) |
| Protocols | HTTP, WebSocket, SSE, gRPC |

## Specification

Open [`/spec/main.html`](/spec/main.html) for the full interactive spec with architecture diagrams, code samples, and API details.

## Local Development

- Framework tests live under [`apps/lib/test`](apps/lib/test) and run with `bun run test` from [`apps/lib`](apps/lib).
- The app package and entrypoints live under [`apps`](apps), while TMS domain code lives under [`apps/tms`](apps/tms) and uses the shared framework package from [`apps/lib`](apps/lib).
