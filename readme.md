# ERP Rendering Framework

A TypeScript library for building ERP interfaces at maximum speed. YAML-driven components, embedded SQL, multi-protocol data, OOP rendering, and custom scripting in any language — all wired together so teams ship enterprise features without boilerplate.

## Core pillars

| Pillar | What it does |
|--------|-------------|
| **YAML-driven assembly** | Pages, components, data sources, queries, CRUD, and protocols declared in human-readable YAML |
| **OOP rendering & tree** | Components live in a tree with pure JSON state, full traversal (`parent`, `children`, `root`), and named actions via `submit()` |
| **Embedded SQL & repository** | SQL queries live inside YAML. Repository pattern abstracts the DB engine — switch from Postgres to DuckDB in one line |
| **Custom scripting** | Embed logic in JS, TS, Python, Lua, or Shell directly in YAML — inline or external file |
| **Multi-protocol comms** | Each data source specifies its transport: HTTP, WebSocket, SSE, or gRPC |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      YAML Page Definition                      │
│  components, datasources, CRUD, queries, protocols, permissions│
└──────────────────────────┬──────────────────────────────────────┘
                           │  parsed at build / runtime
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────────┐  ┌────────────────────┐
│   Frontend   │  │  Data Pipeline   │  │   Communication    │
│   Renderer   │  │   (Backend)      │  │     Layer          │
│              │  │                  │  │                    │
│ Component    │  │ Repository       │  │  HTTP / REST       │
│ Tree (OOP)   │  │ Pattern ──► DB   │  │  WebSocket         │
│ html.js core │  │ Embedded SQL     │  │  SSE               │
│ draw/redraw  │  │ CRUD operations  │  │  gRPC              │
└──────┬───────┘  └────────┬─────────┘  └─────────┬──────────┘
       └───────────────────┼──────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Auth & Permission Layer                      │
│   Pluggable interface — client project provides implementation │
└─────────────────────────────────────────────────────────────────┘
```

## Frontend rendering

### Base component

All components inherit from `BaseComponent`. Pure JSON state, DOM target, lifecycle methods, full tree traversal:

```typescript
abstract class BaseComponent<S = any> {
  state: S;
  readonly parent: BaseComponent | null;
  readonly children: BaseComponent[];
  readonly root: BaseComponent;
  readonly id: string;

  abstract draw(container: HTMLElement): void;
  redraw(): void;
  setState(partial: Partial<S>, redraw?: boolean): void;
  find(id: string): BaseComponent | null;
  submit(action: string, params?: Record<string, any>): Promise<any>;
}
```

### Server-first data & component-based rendering

The server sends a **flat 1D array** with all data fully resolved — every JOIN, lookup, and transformation happens server-side. On the frontend, what were formerly "columns" are **components** — real `BaseComponent` instances in the virtual tree.

```yaml
# Server: flat, fully resolved data
datasources:
  - id: purchase-orders
    db: postgres
    roles: [admin, purchasing]
    permission: "po.read"
    query: |
      SELECT po.id, po.po_number,
             v.name AS vendor_name, v.code AS vendor_code,
             s.label AS status_label, s.color AS status_color,
             po.total, po.created_at
      FROM purchase_orders po
      JOIN vendors v ON v.id = po.vendor_id
      JOIN po_status_codes s ON s.code = po.status
      WHERE po.branch_id IN (:allowed_branches)
      ORDER BY po.created_at DESC
```

```yaml
# Frontend: components, not columns
components:
  - type: GridView
    id: po-grid
    source: purchase-orders
    components:
      - type: TextCell
        id: po-number
        field: po_number
        label: PO #
      - type: TextCell
        id: vendor
        field: vendor_name
        label: Vendor
        secondary: vendor_code
      - type: CurrencyCell
        id: amount
        field: total
        label: Amount
        class: "tabular-nums text-right"
      - type: BadgeCell
        id: status
        field: status_label
        label: Status
        color: status_color
```

Component tree — every cell is a real `BaseComponent`:

```
PageRoot
├── POGridEvents  (event handler — page level)
├── GridView (po-grid)
│   ├── Row0
│   │   ├── TextCell (po-number)
│   │   ├── TextCell (vendor)
│   │   ├── CurrencyCell (amount)
│   │   ├── BadgeCell (status)
│   │   └── DateCell (created)
│   └── Row1 ...
└── SummaryCard (totals)
```

### Page-level event handler

All event listeners are handled by a single class at the page level, inherited from `BaseComponent`:

```typescript
class POGridEvents extends BaseComponent<{ selectedIds: string[] }> {
  onCellClick(cell: BaseComponent, row: Record<string, any>) {
    if (cell.id === "status") {
      this.showStatusDropdown(cell, row);
    }
  }

  onRowSelect(rows: Record<string, any>[]) {
    this.setState({ selectedIds: rows.map(r => r.id) });
    const summary = this.root.find("totals");
    summary?.setState({
      selectedTotal: rows.reduce((s, r) => s + r.total, 0),
      selectedCount: rows.length
    });
  }

  async onBulkAction(action: string) {
    const result = await this.submit(action, {
      po_ids: this.state.selectedIds,
      user_id: this.root.state.user.id
    });
    const grid = this.root.find("po-grid");
    grid?.setState({ rows: result.data });
  }
}
```

### Generalizable pattern

The same three-part pattern — **server-first flat data**, **component-based rendering**, **page-level event handler** — applies to any view:

| View | Components | Use case |
|------|-----------|----------|
| **GridView** | `TextCell`, `BadgeCell`, `CurrencyCell` | Tabular data |
| **ListView** | `AvatarItem`, `TitleItem`, `StatusItem` | Vertical lists with rich items |
| **TreeView** | `TreeLabel`, `CountBadge` | Hierarchical data (org charts, BOM) |
| **PDF Report** | Header, table, chart, summary sections | Same data flow, rendered to PDF |

## Backend data pipeline

### CRUD operations

Datasources support full CRUD. Use **default flags** for standard table mutations or **custom functions** when business logic is involved:

```yaml
datasources:
  # Default: auto-generate all mutations from table schema
  - id: vendors
    db: postgres
    table: vendors
    roles: [admin, purchasing]
    permission: "vendors.manage"
    crud: true                      # create + update + delete
    query: |
      SELECT id, name, code, region, status
      FROM vendors ORDER BY name

  # Selective: pick specific operations
  - id: po-lines
    db: postgres
    table: po_line_items
    crud: [update, delete]          # no create

  # Mix: default flags + custom function
  - id: purchase-orders
    db: postgres
    table: purchase_orders
    crud: [delete]                  # default delete
    create:                         # custom create with validation
      language: javascript
      permission: "po.create"
      script: |
        const { vendor_id, line_items } = ctx.params;
        if (!line_items?.length) {
          throw new ValidationError("PO requires at least one line item");
        }
        const po = await ctx.db.create("purchase_orders", {
          po_number: await ctx.db.nextSequence("po_number_seq"),
          vendor_id,
          status: "draft",
          total: line_items.reduce((s, li) => s + li.qty * li.unit_price, 0),
          created_by: ctx.user.id
        });
        for (const li of line_items) {
          await ctx.db.create("po_line_items", { po_id: po.id, ...li });
        }
        return po;
```

Frontend calls CRUD via `submit()`:

```typescript
await this.submit("vendors.create", { name: "Acme", code: "ACM" });
await this.submit("vendors.update", { id, name: "Acme Corp" });
await this.submit("vendors.delete", { id });
```

### Supported databases

| Engine | Use case | Driver |
|--------|----------|--------|
| PostgreSQL | Primary OLTP, multi-user production | `pg` |
| SQL Server | Enterprise / legacy integration | `mssql` |
| SQLite | Single-user, embedded, edge deployments | `better-sqlite3` |
| DuckDB | Analytics, OLAP, large dataset queries | `duckdb-node` |

## Custom scripting

Embed logic in any language directly in YAML — inline or as an external file reference:

```yaml
datasources:
  - id: enriched-orders
    language: javascript
    roles: [admin, sales]
    permission: "orders.read"
    script: |
      const orders = await ctx.datasource("recent-orders");
      return orders.map(order => ({
        ...order,
        tax: order.total * 0.08,
        priority: order.total > 10000 ? "high" : "normal"
      }));

  - id: inventory-sync
    language: python
    script_file: ./scripts/inventory_sync.py
    timeout: 30s
```

Every script receives a `ctx` object:

```typescript
interface ScriptContext {
  user: User;
  params: Record<string, any>;
  datasource(id: string): Promise<any>;
  db: IRepository;
  http: { get, post, put, delete };
  log: Logger;
  env: Record<string, string>;
}
```

Supported runtimes: JavaScript (V8), TypeScript (V8 + ts-strip), Python (subprocess/Pyodide), Lua (Fengari), Shell (sandboxed), Custom (pluggable adapter).

## CSS system

Tailwind CSS is the default styling system. Components apply utility classes directly in `draw()` via `.cls()`:

```typescript
class BadgeCell extends BaseComponent<{ value: string; color: string }> {
  draw(el: HTMLElement) {
    html(el)
      .span(this.state.value)
        .cls("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium")
        .cls(this.state.color)
      .end();
  }
}
```

Override per-component in YAML without touching TypeScript:

```yaml
components:
  - type: CurrencyCell
    id: amount
    field: total
    class: "tabular-nums text-right font-mono"
```

Escape hatch: `.style()` for inline CSS when utilities aren't enough.

## Auth & authorization

Pluggable interface — the framework does not implement auth. The host application provides its own:

```typescript
interface IAuthProvider {
  getCurrentUser(): Promise<User | null>;
  hasPermission(user: User, action: string, resource: string): boolean;
  getSecurityContext(user: User): SecurityContext;
}

framework.configure({
  auth: new MyOAuth2AuthProvider({ ... })
});
```

Row-level security values (`:allowed_branches`) are injected into SQL parameters automatically.

## Tech stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Language | TypeScript | Type safety across frontend and backend |
| DOM Rendering | html.js (wrapped) | Fastest raw rendering; OOP layer on top |
| Component Model | Custom OOP classes | State, inheritance, draw/redraw lifecycle |
| CSS | Tailwind CSS | Utility-first, no separate stylesheets, YAML-overridable |
| React Interop | ReactBridge adapter | Access to React ecosystem when needed |
| Config Format | YAML | Human and agent readable, diffable |
| Server Runtime | Node.js / Bun | TypeScript native, fast startup |
| Database Access | Repository pattern | Swap engines without changing app code |
| Scripting | JS, TS, Python, Lua, Shell | Custom logic in any language, sandboxed |
| Auth | Pluggable interface | No vendor lock-in; host app provides impl |

## Design principles

- **Convention over configuration** — sensible defaults, override only when needed
- **YAML is the source of truth** — if it's not in the YAML, it doesn't exist on the page
- **One line to switch** — database, protocol, or auth provider
- **No black boxes** — every built-in component can be extended or replaced
- **Agent-friendly** — YAML definitions are structured enough for AI agents to read, generate, and modify
- **Security by default** — parameterized queries, row-level auth, permission checks on every render and data fetch

## Specification

Open `agent.html` in a browser for the full interactive specification with diagrams, code samples, and navigation.
