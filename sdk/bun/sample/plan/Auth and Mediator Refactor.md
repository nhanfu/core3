# Plan: Auth Service, Direct Service Communication, and Gateway Rate Limiting

> This revision replaces the earlier "merge Auth and Med into one gate service"
> plan. The gate/mediator merge is obsolete; see §1 for exactly what changed.
> The filename is historical.

## 1. Goal and direction change

Services communicate **directly** with each other. There is no central
mediator or gate in the request path. The **server runtime** (the
`@core3/server` package linked into every process) provides **service
discovery and routing**: each service registers its endpoints at startup, and
callers resolve target services through a registry API before making a direct
point-to-point call.

What stays from the previous revision:

- **Auth remains its own service** (`services/auth`). It owns identity,
  sessions, permissions, token signing, revocation state, and the JWKS
  endpoint. It is not merged into anything.
- A single public entry point exists — the **gateway** — that terminates all
  external traffic, validates client JWTs, applies **rate limits**, and routes
  requests to services using the same runtime resolver every other caller
  uses.
- The security core survives unchanged: pure identity client JWTs with no
  permissions; short-lived audience-scoped internal dispatch tokens for
  service-to-service calls; deny-list revocation checks after signature
  validation; fail-closed when the authorization source is unavailable;
  idempotency keys on mutating calls.

What changes:

- No component sits between caller and callee. A service resolves the target
  through the runtime and opens a direct HTTP connection to it.
- Persistent messaging between two services becomes an explicitly **declared,
  append-only message store** written as Parquet segments, with a local
  filesystem or S3-compatible object-store backend (§6). This generalizes the
  segment machinery already proven in `../med/src/event-store.ts`
  (parquet-wasm + Apache Arrow, hot segments, durable vs low-latency writes).
- Deadlines and cancellation propagate hop-by-hop as transport headers and
  abort signals instead of living in a central cancellation registry (§5).

What is dropped from scope:

- The standalone WebSocket mediator (`../med`) leaves the critical path.
  `CORE3_EVENT_MODE=mediator` and the mediator spawn in
  `sample/scripts/dev.ts` are removed once the message-log module lands. The
  durable Parquet writer is extracted into the runtime; the mediator process
  itself is no longer required infrastructure.
- Gate-owned saga/compensation state machine and gate-owned operation/cancellation
  tables. Cross-service consistency is deferred (§11); this plan leaves the
  seams (idempotent commands, append-only logs) that any later design builds on.

## 2. Components and ownership

- **Gateway** (`sample/server.ts` host, public port)
  - Terminates external HTTP/WebSocket traffic.
  - Validates client JWT signature and claims, then checks deny list and
    session/revocation state (§4).
  - Enforces rate limits **before** routing or authz work beyond signature
    checks where possible (§8).
  - Resolves target services through the shared runtime resolver and forwards
    requests directly, propagating identity, correlation, deadline, and
    cancellation headers.
  - Exchanges the validated client context for an audience-scoped internal
    dispatch token per target service (§4).
- **Auth service** (`services/auth`)
  - User/device/session records, permission catalog, refresh-token rotation.
  - Signs client access JWTs (pure identity claims).
  - Mints short-lived internal dispatch tokens (`aud=<target service>`) to
    authenticated callers — the gateway on behalf of a user, or a service with
    its workload credential.
  - Publishes asymmetric verification keys through a JWKS endpoint; owns the
    signing-key ring and rotation (§4).
- **Server runtime** (`packages/server`)
  - Service registry: registration, TTL heartbeat, deregistration, health.
  - Resolver API: `resolve(serviceId)` → endpoint descriptor, cached
    in-process with bounded TTL.
  - Direct-call transport client: attaches dispatch token plus protocol
    headers; enforces deadlines; surfaces typed route errors.
  - Message-log module (§6): declared append-only Parquet stores, local FS or
    S3-compatible backend.
  - Keeps the existing topic envelope contracts
    (`packages/server/src/topics/contracts.ts`); only the delivery under them
    changes.
- **Domain services** (`services/*`)
  - Keep `manifest.yaml` / `permissions.yaml` / `storage.yaml`; add an
    optional `messages:` declaration for persistent logs (§6).
  - Serve calls directly; verify incoming dispatch tokens against auth's
    JWKS; never accept a client JWT for a protected operation.

## 3. Discovery and routing in the server runtime

### Registry

Each service process announces at startup:

```yaml
service_id: order
instance_id: <uuid>            # new per process start
transport: http                # 'http' | 'inproc'
base_url: http://127.0.0.1:<port>
topics: [orders.read, orders.create, ...]   # topic@version from contracts.ts
health_path: /healthz
ttl_ms: 15000
```

- Registration goes to the registry hosted by the gateway/host node. In the
  dev topology everything is spawned locally with dynamic ports
  (`findAvailablePort` in `sample/scripts/dev.ts`), so registration-on-start
  with the real port is what makes resolution possible.
- Entries are refreshed by heartbeat before TTL expiry; graceful shutdown
  deregisters; crashed instances expire by TTL.
- POC registry state is in-memory in the host process and rebuilt purely from
  registrations — there is nothing to persist; services re-register after a
  restart. Multi-node registry sharing is a scale-out decision (§11).

### Resolution and calling

```ts
const endpoint = runtime.resolve('order');          // cached, TTL-bounded
const reply = await runtime.call(endpoint, definition, payload, {
  deadlineMs, correlationId, causationId, idempotencyKey, signal,
});
```

- Unknown `service_id` → typed `SERVICE_NOT_FOUND`. Known but unreachable →
  `TARGET_UNAVAILABLE` after one refresh-and-retry for idempotent calls;
  non-idempotent calls fail through to the caller untouched.
- Two transports implement the same interface: `http` (separate processes) and
  `inproc` (module running inside the host runtime, resolved to a direct
  function dispatch). Every contract test must pass identically against both.
- Request/response keep the existing `TopicRequestEnvelope` /
  `TopicResponseEnvelope` shapes (`kind`, `topic`, `version`,
  `correlationId`, `source`, `ok`/`error`) — only the hop count changes.

### Wire headers on every direct call

- `authorization: Bearer <dispatch-token>` — audience is the target service.
- `x-correlation-id`, `x-causation-id` — copied from the inbound request by
  the callee's runtime when it makes further calls.
- `x-deadline-at` — absolute epoch ms; a callee must not start work past it
  and should stop between safe checkpoints.
- `x-cancelled-after: <correlation_id>` — control notification used for
  cancellation propagation (§5).
- `x-idempotency-key` — required for state-mutating commands; targets dedupe
  through their inbox.

## 4. Security model

### Client JWT

Unchanged in intent: stable identity/session claims only —

- `iss`, `aud`, `sub`, `jti`, `sid`, `did`; `iat`, `nbf`, `exp`;
- `user_security_revision`, `session_revision`; `token_type=client_access`.

No permissions, roles, or branch access in tokens. Validity alone grants
nothing: the gateway checks cached/durable session state after validating the
signature, and fails closed if it cannot establish current state.

### Signing keys

Move off today's shared HS256 secret
(`packages/server/src/auth/jwt.ts`, `DEFAULT_AUTH_JWT_SECRET`) to asymmetric
signing with a durable key ring in auth:

- Separate `kid` namespaces and purposes for client-access JWTs and internal
  dispatch tokens.
- Private keys exist only inside auth; clients and services verify through the
  published JWKS.
- Rotation: register new key `published` → publish public key → mark `active`
  → keep the predecessor verifiable until every token it signed has expired
  (plus skew) → `retired` → removed after retention.
- Verifiers cache by `(issuer, purpose, kid)`; an unknown `kid` triggers one
  forced JWKS refresh, then rejection.
- Compromise response mirrors the previous revision: stop signing immediately,
  drop the `kid` from the accepted set, bump user/session security revisions
  or a global epoch, force verifier refresh.

### Internal dispatch tokens

Because there is no central dispatcher anymore, the *caller* presents
credentials to auth and caches the result:

1. The gateway authenticates the user (client JWT + revocation check), then
   requests a dispatch token for the concrete target audience. Cached per
   `(session_id, target_service)` until shortly before expiry, single-flight
   per key.
2. A service authenticates with its configured workload credential and does
   the same for its own outbound calls. Cached per `(target_service)`.

Token claims:

- original subject/session/device identity (when acting for a user);
- `iss=auth`, `aud=<target-service>`, `token_type=internal_dispatch`;
- `jti`, `iat`, `exp`, unique `dispatch_id`;
- `authz_version` and the permission snapshot resolved at mint time;
- `source_service`, `correlation_id`, `causation_id`;
- `parent_jti` reference to the originating client token — never the raw
  bearer token.

Targets verify signature, issuer, audience, type, and expiry via JWKS and
trust the claims without a second permission lookup. Wrong audience/type/
expired/signature → reject. Authorization is decided when the token is minted;
the next dispatch re-resolves.

### Service communication policy

The declarative source→target policy table moves to auth and is enforced at
token-mint time: auth refuses to issue a dispatch token for a
`(source_service, target_service, command class)` pair that has no allowed
policy entry. Targets additionally reject tokens whose audience is not
themselves. Policy enforcement therefore stays centralized in auth without
putting auth on the data path of every call.

### Deny list and revocation

Same semantics as the previous revision, scoped down to POC reality:

- In-process deny markers at the gateway/auth (`deny:jti:<jti>`,
  `deny:session:<sid>`, `deny:user:<uid>` with revision), checked after
  signature/claim validation and before authorization lookup; each marker
  expires with the newest token it can reject plus skew allowance.
- Durable `user_device_sessions` revisions remain the authority; cache misses
  rebuild from the durable row; logout-all-devices commits the durable user
  revision first, then updates markers and cache, failing closed until both
  steps complete.
- Refresh-token rotation keeps only keyed hashes; reuse of an old generation
  revokes the family.

Raw bearer tokens are never logged or written unencrypted anywhere.

## 5. Deadlines and cancellation

Cancellation is cooperative and header-driven, not registry-driven:

- In-flight calls abort when the caller cancels the HTTP request (abort
  signal → connection close); callees surface that to domain handlers.
- Explicit late cancellation sends `x-cancelled-after` downstream so already-
  accepted background work can stop at the next checkpoint.
- Callee obligations: honor `x-deadline-at` before starting and between
  chunks/pages; make completion-after-abort harmless (response discarded);
  never retry past the deadline.
- Long-running operations return an `operation_id` immediately and expose
  status/cancel endpoints on the owning service; cancelling means routing a
  normal authorized call to those endpoints through the same resolver. The
  owning service persists enough operation state to survive its own restart —
  this responsibility moves from the old gate to each service that offers
  long-running work.

## 6. Declared persistent message stores (append-only Parquet)

When two services need persistent messages (audit trail, async hand-off,
replayable history), the producing side declares an append-only log. Format
and storage are fixed: **Parquet segments**, written through the runtime
message-log module extracted from `../med/src/event-store.ts`.

```yaml
# e.g. services/order/messages.yaml, referenced from manifest.yaml
messages:
  - name: order-events
    append_only: true
    format: parquet
    schema:
      columns:
        - { name: id, type: varchar }
        - { name: sequence, type: bigint }
        - { name: event_at, type: bigint }
        - { name: type, type: varchar }
        - { name: source_service, type: varchar }
        - { name: correlation_id, type: varchar }
        - { name: payload, type: varchar }
    backend: ${CORE3_MESSAGE_BACKEND:-local}   # local | s3
    path: ../coredb/messages/order-events      # local backend root
    # s3 backend:
    bucket: core3-messages
    prefix: order/order-events/
    endpoint: ${CORE3_S3_ENDPOINT:-}           # blank = AWS default; MinIO in dev
    retention_ms: 604800000
    segment_max_rows: 200
    write_mode: durable                        # durable | low_latency
```

Semantics:

- **Append-only.** Producers add records; committed records are immutable.
  Consumers tail by monotonic `sequence` offset. Removal happens only as
  whole expired segments during retention sweeps.
- **Commit protocol.** Buffer rows in memory → serialize a segment with
  parquet-wasm → write to a temporary location → flush/close (local) or
  complete a full PUT (S3-compatible stores have no append API; whole-segment
  uploads only) → validate read-back → atomically publish the manifest entry
  (local rename; manifest object written last for S3). Only committed segments
  are visible to consumers.
- **Durability.** `write_mode: durable` acknowledges only after the manifest
  commit; `low_latency` acknowledges on buffer accept and flushes
  asynchronously. Acknowledged durable appends survive process restart:
  recovery replays valid segments and truncates only an incomplete un-published
  tail; a corrupt committed segment stops startup of that log or isolates it —
  it is never silently skipped.
- **Delivery.** Consumers persist their own cursor (sequence watermark) per
  log. Delivery is at-least-once; consumers dedupe via `id` /
  `x-idempotency-key` inbox checks. Poll/batch reads first (matching the
  existing pull/ack subscription shape); push notification can be layered on
  later without changing the format.
- **Pairwise pattern.** For a persistent exchange between two services, the
  producer declares its outbox log; the consumer declares (or configures) a
  cursor against it. No broker process exists in this design.
- **Backends.** `local` (filesystem, default POC) and `s3` (any S3-compatible
  store: AWS S3, MinIO, R2). Backend choice is configuration, not code: both
  implementations pass the identical conformance suite (§10). Manifest CAS on
  S3 uses conditional writes where available; otherwise sequence-gap detection
  rejects a lost race.
- **Not a query engine.** Logs serve append, tail, and range replay. Analytics
  over them go through DuckDB reading the same Parquet files, outside the
  request path.

## 7. Gateway responsibilities

- Single public entry point; external clients see only the gateway.
- Order of filters per request: coarse pre-auth rate limit (by source IP) →
  JWT signature/claims → deny list / session-revocation check → fine-grained
  rate limit (per user/session/route class) → resolve target via runtime →
  obtain/refresh dispatch token (cached) → forward directly to the service →
  stream the response back.
- Propagates correlation/causation/deadline headers; converts client
  disconnects into abort signals on the upstream call.
- Does not own business data, sagas, event storage, or cancellation registries.
  Its durable footprint is configuration and (later) rate-limit audit logs.

## 8. Rate limiting

**Decision: rate limiting is a built-in gateway filter stage, not a separate
service.**

Rationale:

- It must shed load at the cheapest possible point — before authz resolution,
  dispatch tokens, or any downstream work. The gateway is already the first
  hop for all external traffic.
- A standalone limiter adds one network hop to every request on the hot path,
  introduces a new failure mode (its outage forces a fail-open-or-closed
  decision for everything), and buys nothing at single-node scale.
- The POC needs no shared state at all: counters live in gateway memory.
- When multi-node deployment eventually requires shared quotas across gateway
  instances, the right shape is still a limiter library backed by a shared
  counter store behind the same interface — not a rate-limit microservice.

Design:

- **Two stages.**
  1. Pre-auth, keyed by source IP: coarse ceiling protecting JWT verification
     and auth lookups from junk traffic.
  2. Post-auth, keyed by `(user_id|session_id, route/service class)`:
     fine-grained quotas. Unauthenticated requests only ever face stage 1.
- **Algorithms.** Fixed/sliding window counters for stage 2 (cheap,
  deterministic, good enough for quotas); token bucket where burst smoothing
  matters (login, refresh endpoints). Optional concurrency cap per expensive
  route.
- **Declarative rules** in gateway config, evaluated most-specific-first:

```yaml
rate_limits:
  - scope: ip
    max: 300
    window_ms: 60000
  - scope: user
    route_class: api
    max: 100
    window_ms: 10000
  - scope: user
    service: report
    max: 5
    window_ms: 60000
```

- **Responses.** Rejected requests get `429` with `Retry-After` and
  `X-RateLimit-Limit` / `-Remaining` / `-Reset` headers. A rejected request
  reaches no service — provable in tests.
- **Bounded memory.** Key cardinality is capped (LRU eviction with an alarm
  metric); spoofed-IP floods must degrade to eviction pressure, not OOM.
- **Observability.** Per-rule accepted/rejected counters exported alongside
  the existing structured logs.
- **Placement guarantee.** Rate limiting runs only at the gateway. Services
  may apply their own admission control internally, but cross-service direct
  calls are governed by deadlines, budgets, and policy — not by the edge
  limiter.

## 9. Non-negotiable invariants

- No client JWT contains permissions; no service accepts a client JWT for a
  protected operation.
- Every internal call carries an auth-issued, audience-scoped, expiring
  dispatch token; wrong audience/type/expiry is rejected everywhere.
- Revocation and deny checks precede authorization decisions; missing or
  unavailable authority fails closed.
- A service cannot call a target without a matching communication-policy
  entry — enforced at token mint time by auth.
- Rate limits evaluate before any routing or dispatch; a `429` request
  consumes zero downstream work.
- Committed Parquet segments are immutable and acknowledged durable appends
  survive restart; corruption is isolated loudly, never skipped.
- Duplicate delivery cannot duplicate a business effect when targets use
  their inbox/idempotency contract.
- Deadlines and cancellation propagate across every hop; a late response
  cannot revive cancelled or expired work.
- Raw bearer tokens never appear in logs or unencrypted storage.

## 10. Verification plan

Focused tests:

- Registry: register → resolve → heartbeat expiry → unknown-service error;
  stale-entry refresh on connect failure; retry policy differs for idempotent
  vs non-idempotent calls.
- Transport parity: the full call-contract suite passes identically against
  `inproc` and `http` transports.
- Tokens: decoded client JWT contains no permission claims; dispatch token is
  rejected for wrong audience, wrong type, expired, bad signature, unknown
  `kid` (after forced refresh); rotation overlap accepts old+new, retention
  expiry rejects old.
- Deny list/revocation: deny hit rejects before authorization lookup;
  logout-all-devices invalidates all sessions of one user only; durable
  revision rebuild prevents resurrection after marker expiry or restart.
- Policy: source service without a policy entry cannot mint a token for the
  target; target rejects a token whose audience is another service.
- Rate limiting: rule hits return `429` + correct headers and a spy proves
  zero downstream calls; windows reset correctly; concurrent same-key requests
  are counted atomically (no overshoot); key-cardinality cap evicts under
  flood without unbounded growth; stage-1 applies pre-auth, stage-2 post-auth.
- Message log: appended record visible only after commit; acknowledged durable
  appends survive kill -9 recovery; incomplete tail truncated; corrupt
  committed segment isolates the log; duplicate redelivery deduped by
  idempotency key; consumer cursors resume where they left off.
- Backend parity: the entire message-log suite runs green against both `local`
  and `s3` backends (MinIO in CI/dev).
- End-to-end: client → gateway → service happy path with header propagation;
  client disconnect aborts the in-flight upstream call; deadline exceeded
  stops work at the next checkpoint; long-running operation cancel endpoint
  stops the worker and releases resources.

POC acceptance gates:

1. All focused tests above pass; `git diff --check` clean.
2. The dev topology starts with no mediator process
   (`scripts/dev.ts` spawns services only).
3. One demonstrated pairwise persistent flow (e.g. Order outbox → consumer
   cursor replay) works on local backend and MinIO identically.

## 11. Later decisions (explicitly out of scope)

- Shared/multi-node service registry and load-balancing policies beyond
  single-instance targets.
- Distributed rate-limit counters backing the existing limiter interface.
- Replicated message logs, compaction, push-based subscriptions, cross-node
  consumer fencing.
- Cross-service saga/compensation consistency: deferred. The primitives this
  plan fixes — idempotent commands, audience-scoped tokens, append-only
  replayable logs — are deliberately the building blocks such a design would
  consume, so adding it later should not change wire formats defined here.
