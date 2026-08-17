# Gate Service: Auth, Event Storage, and Mediator POC

## 1. Goal and scope

Merge Auth and Med into one process called the **gate service**.

The gate is the only component that:

- authenticates client JWTs;
- loads current user/device state and permissions;
- authenticates service-to-service callers;
- adds an authorization snapshot before dispatching to a concrete service;
- stores and dispatches events;
- owns the cancellation chain for calls that pass through it; and
- runs the generic multi-step saga/compensation state machine for
  cross-service business flows (e.g. Order → Inventory → Payment), while
  domain services own what each step and compensation actually does.

This plan targets one node and one gate process first. It does not design
leader election, replication, sharding, service mesh routing, or scale-out.
Those are later extensions after the single-node contracts are proven.

The POC should preserve the existing service boundaries. Domain services own
business data and business mutations; the gate owns identity, authorization,
routing, event delivery, and security/audit metadata.

## 2. Security model

### Trust boundaries

- The client token is a pure identity/session JWT. It contains no permissions.
- The gate is the authorization decision point for every client and service
  dispatch.
- Concrete services trust only gate-issued internal dispatch tokens, and only
  for their own audience.
- A concrete service must still verify the internal token's signature, issuer,
  audience, type, and expiry. It does not perform another permission lookup.
- A service must never accept a client JWT directly for a protected operation.

### Client JWT

The gate signs an access token containing only stable identity and session
claims:

- `iss`, `aud`, `sub`, `jti`, `sid`, `did`;
- `iat`, `nbf`, and `exp`; and
- `user_security_revision` and `session_revision`; and
- `token_type=client_access`.

Do not put permissions, roles, branch access, or a permission snapshot in this
token. The token can remain cryptographically valid after logout or permission
revocation; validity alone does not grant access.

The gate validates the signature and pure JWT claims, then checks the cached
user-device token state before accepting a client request.

### Signing-key ring and rotation

The gate uses a durable signing-key ring rather than one permanent signing
key. Keep separate key purposes and `kid` namespaces for:

- client access JWTs; and
- gate-to-service dispatch tokens.

Use asymmetric signing. The gate alone can access private keys; clients and
concrete services receive only the public verification keys through the gate's
configured JWKS or an equivalent local key endpoint. A key record contains
`kid`, algorithm, purpose, public key, encrypted private-key reference, status,
created time, activation time, and retirement time.

Normal rotation is:

1. Generate and durably register a new key as `published`.
2. Publish its public key and wait for verifiers to refresh it.
3. Mark it `active` and use it for new tokens.
4. Keep the previous key available for verification until every token it
   signed has expired, including clock-skew allowance.
5. Mark the old key `retired`, then remove it only after the retention window.

Every verifier caches keys by `(issuer, purpose, kid)`. An unknown `kid` causes
one forced key refresh; continued absence rejects the token. Services must
reject a dispatch token with the wrong purpose, issuer, or audience.

If a private key may be leaked, do not wait for normal expiry. Immediately
stop signing with it, remove it from the accepted verification set, publish a
key-ring update, and invalidate the affected token class. For client tokens,
also bump the relevant user/session security revisions or use a global
client-token security epoch. For dispatch tokens, the short lifetime and
removal of the compromised `kid` should stop new acceptance; in-flight work
must still obey its deadline and cancellation policy. Record the incident and
force all gate/service verifiers to refresh their key ring.

Key rotation must be atomic from the gate's perspective: a request sees either
the old active key or the new active key, never a missing private key or a
partially published key record. Private keys must not appear in logs, Parquet,
JWT payloads, or ordinary configuration snapshots.

### Durable user-device session

The cache must be rebuildable from a durable `user_device_sessions` record.
This is the authority for whether a device/session is active, even though the
gate normally reads it through the cache. At minimum, store:

- `user_id`, `device_id`, and `session_id`;
- active/revoked state and revocation reason;
- device/session security revision;
- client access-token `jti` metadata where needed for audit, but not the raw
  access JWT;
- refresh-token family ID and current refresh generation;
- a keyed hash of the current refresh token, or a hash of its token ID;
- refresh-token expiry, last-used time, and rotation time;
- created time, last-seen time, and absolute session expiry; and
- a row version for atomic logout, revocation, and refresh rotation.

The raw client access JWT and raw refresh token are never stored in this table.
The access JWT is intentionally self-contained and short-lived; the durable
row supplies the gate's revocation/session check. A refresh token is an opaque
random credential held by the client. Store only a keyed cryptographic hash or
token-ID hash so a database read cannot be used as a bearer credential.

Keep the current refresh state in this row for a fast atomic check, but store
rotated generations in a separate `refresh_token_history` table when replay
detection, audit, or concurrent-refresh diagnostics are required. Rotation
must update the device row and refresh history in one transaction. Reuse of an
old generation revokes the session family and clears the cached entry.

### KV deny list

For phase 1 (this single-node POC), the KV deny list is in-process memory
only — no separate KV/cache server. The gate may maintain this process-local
deny list for immediate rejection of otherwise valid client JWTs. Check it
after JWT signature/claim validation and before the authorization cache or
user-permission lookup. Moving it to an external KV store is a scale-out
decision (see §10), not part of this POC.

Use compact deny markers rather than storing complete tokens:

- `deny:jti:<jti>` for one access token;
- `deny:session:<session_id>` for one session/device login; and
- `deny:user:<user_id>` with a user revocation revision or `revoked_before`
  value for logout-all-devices.

Each marker expires after the latest token it can reject, plus clock-skew
allowance. A deny hit rejects immediately and must not trigger a permission
lookup. The KV store is bounded and observable. An active deny marker must not
be silently evicted: use capacity alarms, or have eviction invalidate the
related authorization-cache entries and force a durable revision check before
the next request.

Logout-all-devices must first commit a user-level security revision or
`revoked_before` value in the database, then update the KV marker and clear
the user's device/session cache entries before returning success. New tokens
must carry the relevant user/session revision or `iat` needed to compare with
the marker. The gate rejects a token whose revision is older than the durable
or KV deny marker. This gives immediate rejection in the normal process while
preserving correctness after KV loss or gate restart.

On a single node, update the durable revision and KV marker through one gate
operation and do not report logout success until both steps complete. If the
KV update fails, fail closed for the affected user and keep the durable
revision; do not issue new tokens until the deny marker can be rebuilt.

### Cached user-device token

The gate stores a disposable authorization snapshot keyed by
`(user_id, device_id, session_id)` containing:

- active/revoked state;
- the current device/session revision;
- the effective permissions and their version;
- the time resolved; and
- a short expiry and the client token `jti` where useful for audit.

Logout, device revocation, password/session invalidation, and permission
changes clear or version-bump the relevant cached entries. A cache miss or an
entry below the current security revision must load the durable user-device
session and current permissions. The loaded row repopulates the cache. If the
database cannot establish current state, the gate fails closed.

The cache is an optimization, not the authority. The POC may use an in-memory
cache backed by the durable user-device session and permission store. It must
have bounded expiry and single-flight resolution so a burst of requests does
not perform the same lookup repeatedly.

### Internal dispatch token

Immediately before a gate-to-service dispatch, the gate resolves the newest
permissions and signs a short-lived internal token containing:

- the original subject/session/device identity;
- `iss=gate`, `aud=<target-service>`, `token_type=gate_dispatch`;
- `jti`, `iat`, `exp`, and a unique `dispatch_id`;
- `authz_version` and the permission snapshot;
- `source_service` and `source_dispatch_id` for service-originated calls;
- `correlation_id`, `causation_id`, and `cancellation_id`; and
- a reference to the original client token, such as `parent_jti`, not the raw
  client bearer token.

The internal token is a capability for one target and one short dispatch
window. It must not be returned to the browser. The target service uses its
claims directly and does not call Auth or the gate for a second permission
decision.

If the permission snapshot changes while the request is in flight, the
documented POC boundary is: authorization is decided when the gate creates the
dispatch token. A later dispatch must resolve again and receive the newer
version. Long-running operations must also re-check cancellation and any
operation-specific policy at safe checkpoints.

## 3. Service-to-service authorization

Every service has a gate-recognized workload identity. For the POC this may be
a configured service credential or local key pair; keep the interface ready
for mTLS later.

The gate checks a declarative service communication policy before forwarding a
service command:

- source service identity;
- allowed command/event type;
- target service;
- whether the call may act on behalf of a user;
- required user permission, if any;
- timeout and cancellation policy; and
- idempotency requirements.

A service-originated command must carry a service token or equivalent
authenticated envelope. The gate authenticates the source service, verifies
the communication policy, resolves the newest user permissions when the call
is on behalf of a user, and creates a target-audience dispatch token.

The target receives both the authenticated source context and the current user
authorization snapshot. It may reject the command if its own business rules
or the newer permission version make the command unsafe. This supports the
case where the source service started with an older permission snapshot.

Do not put raw reusable bearer tokens in ordinary Parquet columns. For the
POC, store an encrypted service-token envelope only if replay/audit requires
the token itself; otherwise store its hash, `jti`, source, target, claims
needed for audit, and encryption/key metadata. Access to token material must
be restricted and test data must use synthetic credentials.

## 4. Gate event storage and dispatch

The gate owns an event store separate from domain tables. The event envelope
must include:

- `event_id`, `event_type`, `event_version`;
- `source_service`, `target_service`, and authenticated source identity;
- `created_at`, `deadline_at`, `attempt`, and idempotency key;
- `correlation_id`, `causation_id`, `cancellation_id`, and route path;
- user/device/session identity when acting on behalf of a user;
- `authz_version` at creation and the newest authorization snapshot used at
  dispatch;
- a redacted or encrypted service-token audit envelope; and
- the typed payload.

For the single-node POC:

- append events durably before acknowledging publication;
- use one local writer and a bounded in-memory delivery queue;
- persist event history and service-token audit records as Parquet segments;
- write a temporary segment, flush/close it, validate it, then atomically
  publish the segment manifest;
- use event IDs and idempotency keys for duplicate publication and delivery;
- retry only idempotent commands; and
- record failed deliveries in a dead-letter stream with the failure reason.

Parquet is an audit/history format, not the live queue. The live queue should
track delivery state, attempts, deadlines, and acknowledgements without
scanning all historical Parquet data.

The event store must not silently lose an acknowledged event on process
restart. Recovery replays valid durable segments and any recoverable append
log, truncating only an incomplete tail. A corrupt committed segment stops
startup or isolates that segment; it must not be silently skipped.

## 5. Request and dispatch flow

### Client request

1. The client sends its pure JWT to the gate.
2. The gate validates JWT cryptography and standard claims.
3. The gate loads the user-device cache entry or performs one authoritative
   resolution.
4. The gate rejects revoked, signed-out, expired, or unresolved state.
5. The gate resolves the operation's permission and creates a short-lived
   target-specific dispatch token.
6. The gate forwards the request with the dispatch token and cancellation
   context.
7. The target validates the gate token and executes the domain operation.

### Service command or event

1. The source authenticates to the gate with its service credential.
2. The gate validates the source-to-target communication policy.
3. The gate preserves the user/session context if the command is delegated.
4. The gate resolves current user permissions, not merely the source's old
   snapshot.
5. The gate stores the event envelope and service-token audit metadata.
6. The gate dispatches a new target-audience token and current permissions.
7. The target decides whether the command remains valid under that newest
   context and acknowledges or rejects it idempotently.

## 6. Cancellation and long-running work

Cancellation is part of the protocol, not just an HTTP disconnect.

Every request/event has a `cancellation_id`, deadline, and parent causation
identity. The gate keeps an in-memory cancellation registry for fast abort
propagation, backed by a durable `operations` record so that state survives a
gate restart. A cancellation must:

- stop queue delivery when the event has not started;
- send a cancellation control message to the target when work has started;
- cause the target to cancel database queries, streams, timers, and child
  tasks where the runtime supports it;
- stop retries and prevent a late response from settling the cancelled call;
- be idempotent and safe if it races with completion; and
- be recorded with the chain, actor, reason, and timestamp.

For a long-running report called by Order, do not make the report an
uncancellable child of the original HTTP request. Create a report operation
with its own `operation_id` and `cancellation_id`, persist its status, and
return that ID to the caller. The gate should then:

- accept `cancel(operation_id)` from the original authorized user or an
  authorized owning service;
- mark the operation cancelled before sending the cancellation downstream;
- propagate cancellation to the Order-to-Report chain;
- have Report check cancellation between pages/chunks and cancel its query or
  worker;
- make completion after cancellation a no-op or a clearly marked late result;
  and
- retain the event/audit record even though the compute work is cancelled.

This avoids relying on a browser connection staying open and prevents Order
from holding resources for the full report duration. A cancellation arriving
after the report commits its final result is a normal race: the result is
complete, cancellation is recorded as too late, and no compensating deletion
is implied unless the domain explicitly requires one.

### Durable operation record

Even in this single-node POC, operation/cancellation state must survive a gate
restart — it is not purely in-memory. A durable `operations` table holds one
row per tracked long-running operation:

- `operation_id`, `cancellation_id`, `correlation_id`, and root causation
  identity (e.g. the originating Order request);
- owning user/device/session and/or owning service identity;
- `source_service` and `target_service` (Order → Report for the report case);
- state: `pending`, `running`, `cancel_requested`, `cancelled`, `completed`,
  or `failed`;
- `created_at`, `deadline_at`, `cancelled_at`, and `terminal_at`; and
- a row version for atomic state transitions.

Write the row before dispatching the operation to its target, and transition
it in the same durable step as any cancellation request or terminal outcome
— do not rely only on the in-memory registry to remember that an operation
exists. The in-memory cancellation registry is a fast-path index over this
table, rebuilt from it on startup.

On gate restart, recovery must reconcile every non-terminal `operations` row:

- rows still `pending`/`running` whose owning target cannot confirm the
  operation is still active are marked `failed` (or re-queried from the
  target if the target itself exposes operation status) rather than left
  open indefinitely;
- rows `cancel_requested` at restart re-send the cancellation downstream
  before the row is considered reconciled; and
- no operation row is silently dropped — every row reaches a terminal state
  or is explicitly re-armed for cancellation delivery.

This keeps the acceptance requirement in §9 (no orphaned cancellation or
pending-request records after a forced restart) honest without introducing
the distributed operation-state design deferred in §10.

## 7. Single-node POC architecture

Run one gate process with these modules:

- JWT signer/verifier and key configuration;
- user/device/session resolver and bounded cache;
- service identity and communication-policy checker;
- dispatch-token issuer;
- route registry and request dispatcher;
- durable operations store and in-memory cancellation registry rebuilt from
  it on startup;
- durable event store and bounded delivery queue;
- Parquet segment writer/recovery;
- inbox/idempotency store; and
- structured security and dispatch audit logging.

Concrete services remain separate processes or local test services. The gate
may use direct local transport for the POC, but the transport interface must
preserve deadlines, cancellation, identity, and target audience exactly as a
network transport would.

### Storage backends: Parquet is fixed, relational state is adapter-agnostic

The gate must not be locked to one database product. Three storage
categories exist, each with a different portability rule:

- **Event/audit store — Parquet, fixed.** Event history, service-token audit
  records, and dispatch history (§4) are always Parquet segments, regardless
  of which relational database is configured elsewhere. This is a deliberate
  choice for high-throughput append/read and zero-copy access, not a
  database-portability concern — Parquet is the format, not "a database."
- **KV deny list — in-process memory, fixed.** As already scoped in §2, this
  is not a database at all; it never goes through a database driver.
- **Everything else — behind the existing generic repository/adapter
  boundary, driver-agnostic.** Signing keys, `user_device_sessions`,
  `refresh_token_history`, the service communication policy, `operations`,
  `saga_instances`, and `saga_steps` are all ordinary durable records. They
  must be written through the same `DatabaseAdapter`/`DatabaseDriver`
  abstraction already used elsewhere in this codebase (Postgres, DuckDB,
  MySQL, Oracle, SQL Server), not a gate-specific schema tied to one
  product's SQL dialect or locking model.

Consequences for every row-version/CAS pattern used in this plan (device
session rotation, deny-list revision bump, `operations` state transition,
`saga_instances`/`saga_steps` transition): it must be expressible as a
plain conditional update — `UPDATE ... WHERE id = ? AND row_version = ?`,
zero rows changed is a conflict — using only what `DatabaseDialect.supports()`
already exposes. Do not introduce advisory locks, `FOR UPDATE`, or other
driver-specific locking to make a gate feature work; if a CAS pattern only
works on one driver, redesign the pattern, not the storage promise.

For the single-node POC, pick whichever configured adapter is already
running for the sample services (e.g. DuckDB or Postgres) — the POC is not
where cross-driver compatibility gets exercised, but the schema and access
pattern must not assume anything that driver-agnostic access doesn't
guarantee.

Explicitly defer:

- multiple gate nodes and leader election;
- quorum replication and distributed WAL;
- partition ownership and rebalancing;
- cross-node service discovery and load balancing;
- distributed cache invalidation; and
- global ordering or exactly-once transport claims.

### Implementation language

Phase 1 (this POC) is implemented in Bun/TypeScript, matching the rest of
the `sdk/bun` codebase, so the contracts here can be proven quickly against
real domain services without a second toolchain.

Phase 2 (multi-node: KV deny-list sync, replicated event/operation/saga
state, gate-node routing/fencing) is deliberately out of scope for this
phase, but the correctness burden there is materially different — genuine
multi-threaded concurrency, lock-free or CAS-based data structures, and
race conditions that must be reasoned about at the memory-model level. The
gate service is re-implemented in Zig for phase 2 for that reason: explicit
control over memory layout, no GC pauses in the hot dispatch/cancellation
path, and precise control over concurrency primitives that a single-node
POC does not need to exercise.

This is a reimplementation behind the same contracts, not a rewrite of the
contracts themselves — the wire formats and durable schemas fixed in this
document (client JWT/dispatch-token claims, event envelope §4, `operations`
§6, `saga_instances`/`saga_steps` §11) are the interface phase 2 must keep
so that domain services (still Bun/TypeScript) do not need to change how
they talk to the gate. Phase 2 planning should treat this document's
invariants (§8) as the acceptance bar for the Zig implementation, not
re-derive them.

## 8. Non-negotiable invariants

- No client JWT contains permissions.
- No target service accepts a client JWT for a protected operation.
- Every dispatch has a gate-issued target audience and a bounded expiry.
- Logout/revocation clears or invalidates the cached user-device token.
- A cache miss, stale revision, or unavailable authorization source fails
  closed.
- A service command cannot bypass the source-to-target communication policy.
- Delegated service commands receive the newest permissions resolved by gate.
- Raw bearer tokens are never written to ordinary logs or unencrypted Parquet.
- Acknowledged events survive a single gate restart in the POC.
- Operation/cancellation state for a tracked long-running operation is
  durable: a gate restart reconciles every non-terminal `operations` row
  rather than losing or silently orphaning it.
- Duplicate event delivery cannot duplicate a domain mutation when the target
  uses its inbox/idempotency contract.
- Cancellation propagates through the complete causation chain and is safe to
  race with success, failure, timeout, or retry.
- A late response cannot revive a cancelled or expired request.
- A saga reaches exactly one terminal state (`completed`, `compensated`, or
  `failed`); it is never left `running`/`compensating` without an active
  redelivery, across gate restarts.
- A saga step or its compensation is never applied twice as a business
  effect, regardless of redelivery, because the target's inbox/idempotency
  contract (§4) governs it exactly as any other dispatched command.
- Saga compensation always walks completed steps in strict reverse order;
  a failed compensation stops automatic rollback rather than retrying
  indefinitely or skipping ahead.
- No relational gate schema or CAS pattern depends on a feature specific to
  one database product; every conditional-update pattern is expressible
  through the existing `DatabaseAdapter`/`DatabaseDriver` abstraction on any
  supported driver.
- The event/audit store is always Parquet and the deny list is always
  in-process memory, independent of which relational driver is configured.

## 9. Verification plan

### Focused tests

- Issue a client token and prove its decoded claims contain no permissions.
- Prove a valid client token is rejected after logout or device revocation
  when the gate cache is cleared.
- Prove a deny-list hit rejects a token before authorization lookup.
- Prove logout-all-devices rejects all existing device/session tokens while
  leaving unrelated users unaffected.
- Prove deny-list expiry, KV eviction, and gate restart fall back to the
  durable user/session revision without resurrecting a revoked token.
- Prove a cache miss rebuilds state from the durable user-device session row.
- Prove refresh rotation stores only a token hash, rejects an old generation,
  and revokes the session family on refresh-token reuse.
- Prove permission changes affect the next dispatch and increment
  `authz_version`.
- Prove concurrent cache misses share one authorization resolution.
- Prove an internal token is rejected for the wrong target service, issuer,
  type, signature, or expiry.
- Prove normal key rotation accepts old and new tokens during the overlap,
  then rejects the old key after its retention window.
- Prove an emergency key compromise stops new signing, removes the compromised
  `kid` from verification, and invalidates the affected client-token class.
- Prove service A cannot send a command to service B without an allowed policy
  entry.
- Prove a delegated service command receives newer permissions than the
  source's original snapshot.
- Prove event publication is idempotent and survives restart/recovery.
- Prove Parquet writes recover from an incomplete tail and reject committed
  corruption.
- Prove cancellation before dispatch, during dispatch, during a database
  query, during retry, and at completion.
- Prove a cancelled report releases its query/worker resources and does not
  publish a successful completion after cancellation.
- Prove cancellation and successful completion racing together produce one
  stable terminal operation state.
- Prove a gate restart with in-flight operations reconciles every
  non-terminal `operations` row: re-sends pending cancellations, marks
  unconfirmed running operations as `failed`, and rebuilds the in-memory
  cancellation registry from the durable table with no row left open.
- Prove a 3+ step saga (e.g. Order → Inventory → Payment) completes when
  every step succeeds, and each `saga_steps` row records the correct
  `command_event_id` and `success` outcome in order.
- Prove a mid-chain step failure (e.g. Payment fails) triggers compensation
  of every prior successful step in strict reverse order, and the saga ends
  `compensated`.
- Prove a redelivered step command and a redelivered compensation command
  do not duplicate their business effect, using the same idempotency key
  twice.
- Prove a gate restart mid-saga (command dispatched, no outcome recorded)
  redelivers exactly that step/compensation on recovery rather than
  skipping it or restarting the saga from step 0.
- Prove a saga step that is itself a long-running cancellable operation
  correctly transitions to a failed/compensating saga when its operation is
  cancelled.
- Prove a compensation failure halts automatic rollback and leaves the saga
  in `failed` rather than retrying indefinitely or silently completing.
- Run the same CAS contract suite (device-session rotation, deny-list
  revision bump, `operations` and `saga_instances`/`saga_steps`
  transitions) against at least two configured drivers (e.g. DuckDB and
  Postgres) and prove identical outcomes — no test relies on a
  driver-specific locking feature.

### POC acceptance gates

1. Client authentication, logout, revocation, and permission-change tests
   pass with no permission claims in client JWTs.
2. Client and service dispatch tests prove target-specific gate tokens and
   source-to-target policy enforcement.
3. Event replay, idempotency, Parquet recovery, and dead-letter tests pass.
4. A long-running report can be cancelled from the client through Order to
   Report, and its database/worker resources are released.
5. A forced gate restart recovers acknowledged events and leaves no orphaned
   cancellation or pending-request records.
6. A multi-step saga (Order → Inventory → Payment) completes on the happy
   path, and a mid-chain failure compensates all prior steps in reverse
   order with no duplicated business effect, including across a forced gate
   restart mid-saga.
7. `git diff --check` and the focused Bun tests/builds for the changed gate
   modules pass.

## 10. Later scale-out decisions

This phase is also where the gate is re-implemented in Zig (see
"Implementation language" in §7) because of the concurrency and race-safety
demands below — not merely for performance.

Do not implement these in the POC, but keep the protocol fields and seams so
they can be added without changing domain handlers:

- replicate event segments and delivery state;
- add gate-node routing and fencing;
- publish permission invalidations between gate nodes; and
- define retry and ownership behavior when a target service moves nodes.

(The cancellation registry is already backed by the durable `operations`
table from §6, so multi-node cancellation only needs gate-node routing above
— no separate durable-state migration is required for it.)

### Multi-node KV deny list (phase 2)

Each gate node keeps its own in-memory KV deny list, as in the POC — do not
introduce a shared/consensus KV store just to make deny markers consistent
across nodes. The deny list is a latency optimization, not the authority: the
durable `user_device_sessions` revision (and the bounded-expiry authorization
cache, §2) is already the fallback whenever the deny list doesn't have an
answer, so a missed sync only widens the rejection window up to the cache's
existing bounded expiry — it never produces an incorrect accept beyond that
bound.

Given that, keep the sync mechanism simple:

- when a node writes a deny marker (`deny:jti`, `deny:session`, or
  `deny:user`), it best-effort broadcasts the same marker to every other
  known gate node (e.g. fan-out call or a message on the existing event bus);
  no acknowledgement or quorum is required;
- a node that misses the broadcast (crash, restart, network blip, new node
  joining) is still correct: its own authorization-cache entries expire on
  their existing bounded TTL and re-resolve against the durable revision,
  which reflects the revocation;
- do not attempt to reconcile or replay historical deny markers to a newly
  joined node — its cache starts empty and every entry it serves is either a
  fresh resolution (already correct) or expires into one; and
- keep marker TTLs and cache TTLs from §2 as the only correctness mechanism;
  the broadcast is purely a latency optimization on top of them.

This avoids building distributed-KV consistency for a dataset explicitly
called out as small and non-authoritative, while preserving the same
fail-closed guarantee the POC already has.

The single-node result is successful only when its security and cancellation
contracts are explicit and testable. Scale-out should extend those contracts,
not change what a client token or a target service means.

## 11. Saga-based cross-service consistency

Cross-service business flows (e.g. Order → Inventory → Payment) are not
atomic transactions and do not use 2PC or a consensus protocol. Each step is
a local ACID transaction inside its own service. Consistency across services
comes from an ordered sequence of steps plus compensations, driven by a
generic saga state machine that the gate owns. The gate does not decide
business outcomes; it only sequences dispatch, tracks state durably, and
invokes compensations when a domain service reports failure.

### Saga definition (declarative, per saga type)

A saga type is configured, not hard-coded into the gate, and declares:

- an ordered list of steps; each step has a `target_service`, a command
  event type, an optional compensation event type, a timeout, and whether
  the step is itself a cancellable long-running operation (§6);
- whether the saga overall may be cancelled by the user/owning service, and
  what "cancel" means once it is past a given step (e.g. cancelling after
  payment may require a refund compensation rather than a no-op); and
- retry policy for a step command and for its compensation, reusing the
  idempotency contract from §4 (a step or compensation may be redelivered
  safely).

### Durable saga state

- `saga_instances`: `saga_id`, `saga_type`, `state`
  (`running | compensating | completed | compensated | failed`),
  `current_step_index`, root `correlation_id`/`causation_id`, `created_at`,
  `terminal_at`, and `row_version` for atomic transitions.
- `saga_steps`: `saga_id`, `step_index`, `service`, `command_event_id`,
  `outcome` (`pending | success | failed`), `compensation_event_id`,
  `compensation_outcome`, and timestamps. One row per step, appended as the
  saga advances — this is what lets a saga fan out to more than two services
  without changing the state-machine shape.

Write the `saga_steps` row and advance `saga_instances.current_step_index`
in the same durable step as dispatching the command, exactly like the
`operations` pattern in §6 — a restart must be able to tell exactly which
step was in flight and re-dispatch it idempotently rather than guessing from
the event log.

### Forward and compensation flow

1. Gate dispatches step N's command to its target service (normal dispatch
   path, §3/§4 — dispatch token, current permissions, idempotency key
   `saga_id:step_index`).
2. The target executes its local transaction and returns an outcome event
   (`success` or `failed`), the same outcome-event pattern used for
   cancellation in §6.
3. On `success`, gate marks the step `success` and dispatches step N+1. On
   the last step, the saga is marked `completed`.
4. On `failed`, gate marks the saga `compensating` and walks completed steps
   in reverse order (`current_step_index` down to 0), dispatching each
   step's compensation command with idempotency key
   `saga_id:step_index:compensation`.
5. A step with no compensation event type is treated as naturally
   compensating (nothing to undo). A compensation itself reports `success`
   or `failed`; a failed compensation stops automatic rollback and marks the
   saga `failed` for manual/operator resolution rather than looping retries
   indefinitely.
6. The saga reaches exactly one terminal state: `completed` or
   `compensated` (all compensations succeeded) or `failed` (compensation
   could not complete automatically). No saga is left in `running` or
   `compensating` indefinitely without an active redelivery in flight.

### Interaction with cancellation (§6)

If a step is itself a long-running operation, it uses the `operation_id`
mechanism from §6 unchanged — the saga step just carries that
`operation_id` alongside `command_event_id`. Cancelling a saga while step N
is in flight means: cancel step N's operation (if it is cancellable) or wait
for its outcome, then treat it as a `failed` step and compensate steps
`0..N-1` exactly as in the failure path above. There is no separate
cancellation protocol for sagas — cancellation is just one more way a step
ends up needing compensation.

### Restart recovery

On gate restart, reconcile every non-terminal `saga_instances` row the same
way as `operations` in §6:

- if the current step's command/compensation was dispatched but no outcome
  was recorded, redeliver it using its existing idempotency key — the
  target's inbox contract (§4) guarantees this does not re-run the business
  effect; and
- no `saga_instances` row is left `running`/`compensating` without an active
  redelivery — recovery either confirms the outcome (query the target if it
  exposes status) or redispatches.

### Why no consensus/2PC is needed

Correctness here does not require both services to agree at the same
instant. It requires: (a) each step command is idempotent, (b) each step's
local commit is authoritative for that service the moment it commits, and
(c) failure anywhere after step N is resolved by compensating steps
`0..N-1`, not by rolling back a distributed transaction. Row-version CAS on
`saga_instances`/`saga_steps` resolves the only real race (a redelivered
step and its original both trying to record an outcome) — the same
first-write-wins pattern already used for `operations` in §6, not a
distributed consensus algorithm.
