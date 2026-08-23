# Plan: Auth Service, Direct Service Communication, and Gateway Rate Limiting

> This revision replaces the earlier "merge Auth and Med into one gate service"
> plan. The gate/mediator merge is obsolete; see §1 for exactly what changed.
> The filename is historical.

## 1. Goal and direction change

Services communicate **directly** with each other. There is no central
mediator or gate in the request path. The **server runtime** provides
**service discovery and routing**: each service registers its endpoints at
startup, and callers resolve target services through a registry API before
making a direct point-to-point call.

Development uses two processes only: the gateway and one service host. The
service host loads Auth and every domain service in-process; the gateway stays
out-of-process and reaches the selected logical service through the host's
internal HTTP listener. In production, the same runtime can place services in
separate processes. This is a topology choice, not a separate application
design (§3).

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
  `sample/scripts/dev.ts` remain available until every pair has passed the
  phased message-log cutover (§11), then are removed. The durable Parquet
  writer is extracted into the runtime; the mediator process itself is no
  longer required infrastructure after that retirement.
- Gate-owned saga/compensation state machine and gate-owned operation/cancellation
  tables. Cross-service consistency is deferred (§12); this plan leaves the
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
  - Invokes Auth's dispatch-token use case with the validated client context
    and the concrete route/command. It never resolves permissions or signs an
    authorization result itself; it caches the returned permission token per
    user device (§4).
- **Auth service** (`services/auth`)
  - User/device/session records, permission catalog, refresh-token rotation.
  - Signs client access JWTs (pure identity claims).
  - Owns the one shared dispatch-token use case: resolve authorization for a
    requested target/command, project the allowed permissions, and sign the
    short-lived internal token (`aud=<target service>`). The gateway invokes
    this use case for a user request; a service invokes the same use case with
    its workload credential for an outbound call.
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
    JWKS and enforce only their cryptographic/binding requirements. They trust
    the Auth-projected permission snapshot and do not repeat permission
    lookup/evaluation. They never accept a client JWT for a protected
    operation.

## 3. Discovery and routing in the server runtime

### One configuration schema, topology-specific values

Gateway and service-host configuration use one schema in every environment;
deployment supplies different values rather than selecting a different config
file or a dev-only code path. Service manifests, routes, permission
declarations, and token rules are therefore identical in dev and production.

```yaml
runtime:
  topology: ${CORE3_TOPOLOGY:-distributed}       # dev_inproc | distributed
  service_host_url: ${CORE3_SERVICE_HOST_URL:-}  # required by gateway in dev_inproc
  service_execution: ${CORE3_SERVICE_EXECUTION:-http} # inproc | http
```

- `dev_inproc`: `sample/scripts/dev.ts` starts exactly a gateway process and a
  service-host process. The host loads Auth and all declared domain services
  once, registers each logical service with `execution: inproc`, and exposes
  one authenticated internal listener. Gateway registrations use that listener
  with a service-specific dispatch path; after the HTTP boundary, the host
  calls the selected handler in-process. Auth-to-domain and domain-to-domain
  calls inside the host use the in-process transport.
- `distributed`: the gateway and each service process use the same manifests
  and registry protocol, but registrations carry their own HTTP `base_url` and
  `execution: http`. Application handlers do not branch on topology; the
  runtime selects the transport from the resolved descriptor.
- The service host's internal listener is a transport adapter only: it selects
  the already-registered handler and does not own policy, permissions, retries,
  state, or message delivery. It is not a reintroduced mediator.

### Registry

Each service process announces at startup:

```yaml
service_id: order
instance_id: <uuid>            # new per process start
transport: http                # 'http' | 'inproc'
base_url: http://127.0.0.1:<port>
execution: http                # 'http' | 'inproc'; dev host advertises 'inproc'
topics: [orders.read, orders.create, ...]   # topic@version from contracts.ts
health_path: /healthz
ttl_ms: 15000
```

- Registration goes to the registry hosted by the gateway/host node. In
  `dev_inproc`, every logical service advertises the single service-host
  listener plus its own dispatch path; the gateway uses HTTP to cross its
  process boundary, then the host uses in-process dispatch. In `distributed`,
  registration-on-start with each real port is what makes resolution possible.
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
- Private keys exist only inside Auth; clients and services verify through the
  published JWKS. The shared `issueDispatchToken` use-case implementation
  lives with Auth and is the only path that signs either kind of token. The
  gateway uses its authenticated Auth client; it does not carry a duplicate
  signer or authorization implementation.
- Rotation: register new key `published` → publish public key → mark `active`
  → keep the predecessor verifiable until every token it signed has expired
  (plus skew) → `retired` → removed after retention.
- Verifiers cache by `(issuer, purpose, kid)`; an unknown `kid` triggers one
  forced JWKS refresh, then rejection.
- Compromise response mirrors the previous revision: stop signing immediately,
  drop the `kid` from the accepted set, bump user/session security revisions
  or a global epoch, force verifier refresh.

### Permission-bearing internal dispatch tokens (second signing layer)

The user submits only the unpermissioned client JWT. After the gateway has
validated that token and its session/revocation state, it calls Auth's shared
`issueDispatchToken` use case for the concrete target service and command.
Auth performs the permission decision once, then signs a second, short-lived
internal token containing the resulting permission snapshot. This is a token
exchange, not a gateway-side claim transformation: the gateway cannot add,
remove, or sign permissions.

1. Gateway → Auth receives the validated identity/session/device references,
   requesting client `jti`, target service, and route/command class — never
   the raw client bearer token. The gateway authenticates this internal call
   with its workload credential.
2. Auth rechecks the durable/cache-backed authorization state, applies the
   source-to-target policy, and either rejects the request or signs the
   permission-bearing dispatch token.
3. Gateway caches that token per `(did, sid, client_jti, target_service,
   command_class, user_security_revision, session_revision, authz_version)`.
   The cache is single-flight per key and expires before the earliest of the
   dispatch-token expiry and client-token expiry. Refresh, logout, device
   revocation, session/user security-revision changes, or a permission change
   evicts affected entries immediately.
4. A domain service making an outbound call invokes the same Auth use case
   with its workload credential. It uses an analogous bounded cache keyed by
   acting identity (when any), target, command class, and authorization
   revisions.

Token claims:

- original subject/session/device identity (when acting for a user);
- `iss=auth`, `aud=<target-service>`, `token_type=internal_dispatch`;
- `jti`, `iat`, `exp`, unique `dispatch_id`;
- `authz_version`, `user_security_revision`, `session_revision`, and the
  permission snapshot resolved at mint time;
- `permissions` — the permissions Auth projected for the authorized
  `command_class`; services do not re-resolve or re-evaluate this set;
- `source_service`, `correlation_id`, `causation_id`;
- `parent_jti` reference to the originating client token — never the raw
  bearer token; plus the authorized `command_class`.

Targets verify signature, issuer, audience, type, and expiry via JWKS and
binding claims (target, command class, and source) via JWKS, then use the
embedded permission snapshot without a second permission lookup or evaluation.
Wrong audience/type/command/source, expired/signature, or missing required
claim → reject. Authorization is decided when the token is minted; the next
cache miss or invalidation re-resolves it.

### Service communication policy

The declarative source→target policy table moves to auth and is enforced at
token-mint time: auth refuses to issue a dispatch token for a
`(source_service, target_service, command class)` pair that has no allowed
policy entry. For gateway-originated requests, Auth additionally evaluates the
mapped user permission requirements for that route/command before it projects
the permission snapshot. Targets additionally reject tokens whose audience is
not themselves. Policy enforcement therefore stays centralized in Auth without
putting Auth on the data path of every downstream call.

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
- Permission changes increment an `authz_version` for the affected user/device
  scope and publish a gateway cache-invalidation notice. The gateway includes
  that version in its permission-token cache key; on an unknown or stale
  invalidation stream it refreshes Auth state before using a cached token and
  fails closed if it cannot do so. Token expiry remains the bounded fallback
  if an invalidation is delayed.
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
  invoke or reuse Auth's permission-token result (cached by user device and
  authorization revision) → forward directly to the service → stream the
  response back.
- The gateway sends only identity/session/device references and the requested
  target/command to Auth's use case. It holds no Auth signing key, permission
  evaluator, or alternate token-issuance path.
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
- Every internal call carries an Auth-issued, audience-scoped, expiring,
  permission-bearing dispatch token; wrong audience/type/command/source/expiry
  is rejected everywhere.
- Auth's shared dispatch-token use case is the sole permission evaluator and
  signer. Gateway and services may cache its results, but cannot mint or alter
  a permission token.
- A service verifies a dispatch token and uses its permission snapshot; it
  never repeats Auth permission lookup/evaluation for that request.
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
  `kid` (after forced refresh), source, command class, or missing permission
  snapshot; rotation overlap accepts old+new, retention expiry rejects old.
- Token exchange: a valid client JWT reaches Auth's shared use case with only
  identity/session/device references; Auth accepts an allowed route/command,
  signs the second permission token, and denies a disallowed one. A service
  request succeeds using that snapshot while a permission-store lookup spy
  proves the target did not reevaluate permissions.
- Permission-token cache: identical requests from one device/session/client
  token single-flight to one Auth mint; a different device, target, command,
  token `jti`, or authorization/session/security revision cannot reuse it.
  Refresh, logout, device revoke, and permission-change invalidation evict it;
  stale Auth state fails closed rather than forwarding a cached token.
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
2. The dev topology starts with no mediator process and exactly two runtime
   processes: gateway plus one service host. Auth and all domain services are
   registered and invoked in-process inside that host; gateway remains a
   separate process and reaches them through the host's internal listener.
   The same configuration schema, with `dev_inproc` values, starts this
   topology; switching only values produces the distributed topology.
3. One demonstrated pairwise persistent flow (e.g. Order outbox → consumer
   cursor replay) works on local backend and MinIO identically.

## 11. Incremental delivery phases

Every phase is additive until its own gate passes. Existing working traffic
continues on its current path for any topology, route, or message pair not
explicitly enabled for the new path. Through Phase 6, rollback is a
configuration-value change, not a code revert or data deletion. Phase 7 is a
separate cleanup release only after the replacement has passed its gate and a
soak period; its operational rollback is redeploying the preceding release
artifact.

Use the existing configuration schema to control the transition:

```yaml
runtime:
  topology: ${CORE3_TOPOLOGY:-distributed} # dev_inproc | distributed
gateway:
  dispatch_mode: ${CORE3_DISPATCH_MODE:-current} # current | shadow | enforce
  dispatch_enforced_commands: []                  # empty until Phase 5
events:
  delivery_mode: ${CORE3_EVENT_MODE:-mediator} # mediator | message_log
  message_log_pairs: []                         # empty until Phase 6
```

`shadow` means Auth evaluates and signs the proposed dispatch token for
comparison, but the gateway does not forward it and the current authorization
path remains authoritative. It records only structured decision metadata
(route, service, allow/deny, revision, reason code), never either bearer
token. `enforce` is enabled only for an explicit allowlist of fully-tested
route/command classes; all other traffic remains `current` until migrated.

| Phase | Add and test | Working path while testing | Exit gate |
| --- | --- | --- | --- |
| 0. Characterize | Capture contract tests and smoke probes for login, an allowed and denied protected request, one mutating idempotent request, gateway rate-limit response, and one mediator flow. Add startup validation for the new configuration values, leaving all defaults on the current path. | Entire system is unchanged. | Baseline tests and a real dev smoke probe pass before any behavior changes. |
| 1. Dev service host | Add the service-host launcher and in-process transport. Run Auth and all domain services in one host process while gateway remains separate, using `topology=dev_inproc`. Keep `distributed` available with the same config schema. | The gateway reaches the host's authenticated internal listener; handlers retain their current auth and event behavior. A configuration switch returns to distributed processes. | The same request/response contract suite passes through gateway → host → in-process handler, and process inspection proves exactly gateway plus one service-host process. |
| 2. Edge limiter | Add rate-limit rule parsing and counters in observe mode, then enforce conservative configured limits after observed keys and headers match expectations. | Successful requests retain their existing routing and authorization behavior; only an explicit `429` is new once enforcement is enabled. | Focused limit tests prove pre-auth and post-auth ordering, correct headers, and zero downstream calls for a rejected request. |
| 3. Signing foundation | Introduce Auth's durable asymmetric key ring, JWKS, token-purpose checks, and the shared dispatch-token use case. Gateways and services first accept both valid existing client tokens and the new client-token format; Auth issues only the new format after every verifier is deployed. | Existing client sessions remain valid through their original maximum lifetime. No service receives a dispatch token yet. | Key rotation/JWKS tests pass; a pre-rollout client token and a new client token both complete the baseline protected request. Remove old verification only after its maximum token lifetime plus skew has elapsed. |
| 4. Exchange in shadow | Gateway calls Auth's shared use case after client-token validation for one read-only route/command. Exercise the device-bound cache, revision invalidation, and allow/deny comparison, but forward requests with the current authorization path. | The existing service permission evaluation remains authoritative for the selected route. A shadow mismatch is observable and blocks promotion. | Auth and current-path decisions match over agreed test traffic; cache-key, eviction, and no-raw-token logging tests pass. |
| 5. Dispatch enforcement | Enable `dispatch_mode=enforce` for that one route/command. Gateway forwards Auth's second permission token; its target checks token binding only and does not query permissions. Expand one route/command class at a time, leaving unlisted routes on the current path. | A failed or disabled route-level rollout falls back by configuration to the current path; already-enforced routes are not silently dual-authorized. | For every migrated route, allowed/denied, wrong-audience/command/source, logout/device-revoke, permission-change invalidation, and target-no-lookup tests pass. |
| 6. Message-log migration | Build and test local Parquet append/tail/recovery independently. Shadow-tail one existing mediator flow into a read-only consumer, then cut over one producer/consumer pair at a time with idempotency protection. | Mediator continues to carry every pair not individually cut over. No message pair is published to two effectful consumers without the inbox/dedupe test. | The selected pair survives restart, replays once-effectfully, and passes local plus MinIO parity before the next pair moves. |
| 7. Retirement | After every protected route uses dispatch enforcement and every mediator flow has moved, remove the legacy verifier, current authorization path, mediator spawn, and `CORE3_EVENT_MODE=mediator`. | There is no fallback after removal; this is permitted only after the preceding phase gates and a release soak period. | The complete focused suite, dev two-process topology, and one end-to-end persistent flow pass with no legacy mode referenced by startup or configuration validation. |

Phase ownership is deliberately narrow: Phase 1 changes topology, Phases 3–5
change token handling, and Phases 6–7 change message delivery. Do not combine
them in one deployment; each phase starts from a passing predecessor and
leaves a focused, repeatable regression test behind.

## 12. Later decisions (explicitly out of scope)

- Shared/multi-node service registry and load-balancing policies beyond
  single-instance targets.
- Distributed rate-limit counters backing the existing limiter interface.
- Replicated message logs, compaction, push-based subscriptions, cross-node
  consumer fencing.
- Cross-service saga/compensation consistency: deferred. The primitives this
  plan fixes — idempotent commands, audience-scoped tokens, append-only
  replayable logs — are deliberately the building blocks such a design would
  consume, so adding it later should not change wire formats defined here.
