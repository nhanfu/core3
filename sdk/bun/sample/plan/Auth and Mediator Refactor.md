# Detailed Auth and Mediator Refactor with Concurrency and Consistency Verification

## 1. Correctness Model and Non-Negotiable Invariants

### Auth invariants

- Resource services possess public signing keys only; compromising a verifier must not permit token issuance.
- A protected request is accepted only when:
  1. The ES256 signature, issuer, audience, token type, and time claims are valid.
  2. The local session/device/permission entry is no more than 30 seconds old.
  3. Cached security revisions are equal to or newer than those carried by the token and invalidation stream.
- Cache versions are monotonic. A delayed Auth response must never overwrite a newer invalidation or resolution.
- Under healthy mediation, revocation and permission changes must reach every service instance within two seconds at p99. Regardless of delivery health, no service may trust cached state beyond 30 seconds.
- Requests authorized before a revocation transaction commits may finish. Any authorization performed after the service observes the new revision must use the new state.
- Only one refresh-token generation is current for a session. Concurrent refreshes cannot create multiple valid descendants.
- A committed Auth mutation and its invalidation outbox record are atomic.
- Auth shards are authoritative; process-local KV caches are disposable and reconstructable.

### Mediator invariants

- A durable publish is acknowledged only after the WAL record and commit marker are fsynced on at least two of three replicas.
- At most one unfenced writer can commit to a partition. Followers reject every operation carrying an older fencing token.
- Each partition has strictly increasing, unique offsets. No global ordering is promised across partitions.
- An acknowledged message is never lost after any single mediator-node failure.
- `single` and `multiple` provide at-least-once delivery. Exactly-once business effects come from a transactional consumer inbox, not from transport claims.
- Consumer checkpoints advance only across a contiguous acknowledged prefix. Acknowledging offset 12 while 11 is incomplete must not skip 11.
- Compaction never changes message identity, partition, offset, checksum, or committed status.
- `forward` traffic is not written into the business event stream. Only redacted trace records are retained.
- Non-idempotent `forward` calls are never automatically replayed. Idempotent calls may retry only with the original idempotency key.
- Expired deadlines are terminal: queued, retrying, or late response frames cannot revive an expired request.

### Distributed consistency model

- Strong consistency exists inside one Auth-shard transaction and inside one mediator partition’s quorum-committed log.
- Cross-service permission and device state is bounded-stale, with a hard 30-second fail-closed limit.
- Cross-service business workflows use outbox, inbox, idempotency, versioned events, and compensation. No distributed transaction is introduced.
- All shared coordination uses compare-and-swap versions, leases, and fencing. No advisory locks, `FOR UPDATE`, or driver-specific database locking.

## 2. Auth and JWKS Implementation

### Persistent model

- Use PostgreSQL as the first production Auth adapter while preserving the existing generic repository boundary.
- Shard user-owned records by `hash(user_id)`.
- Shard the normalized-email directory independently. Its record contains `normalized_email`, `user_id`, `user_shard`, `directory_epoch`, and `row_version`.
- Add:
  - `auth_signing_keys`
  - `auth_devices`
  - `auth_sessions`
  - `auth_refresh_history`
  - `auth_security_revisions`
  - `auth_outbox`
  - `auth_idempotency`
- Every mutable record carries `row_version`. Conditional mutation is `UPDATE ... WHERE id = ? AND row_version = ?`; zero changed rows is a conflict.
- Signing private keys are envelope-encrypted. Only Auth loads the decryption key. JWKS contains public parameters only.

### Token profile

- ES256 access tokens expire after 15 minutes and include `typ=at+jwt`, `iss`, `aud`, `sub`, `jti`, `sid`, `did`, `iat`, `nbf`, `exp`, and security revision claims.
- Permit 60 seconds of clock skew. Reject missing audience, unexpected algorithm, unknown issuer, malformed `kid`, and tokens without session/device claims.
- Effective permissions are returned by `auth.session.resolve`, not trusted from the final JWT format.
- Refresh tokens are opaque random values stored only as hashes and rotated using a session-generation CAS.
- Concurrent refresh rules:
  - The first request for a generation succeeds.
  - An identical idempotency key returns the original result.
  - A different request racing within five seconds receives `409 REFRESH_CONFLICT`; it does not create another token.
  - Reuse outside that window revokes the session family, increments its revision, and emits an invalidation.

### JWKS and local verifier

- Publish `/.well-known/openid-configuration` and `/.well-known/jwks.json`.
- Use `ETag` and `Cache-Control: public, max-age=300`.
- Cache keys by `(issuer, kid)`. Collapse concurrent cache misses into one fetch per issuer.
- An unknown `kid` triggers one forced refresh; failure or continued absence rejects the token.
- Keep retired public keys visible for at least 30 minutes.
- Rotate signing keys using: create next key → publish it → wait one JWKS cache interval → begin signing → retain old verification key through the overlap → retire.
- Services use a bounded LRU-style in-memory KV for security state. Entries contain snapshot version, session/device state, effective permissions, resolution time, and expiry.
- Cache refresh is single-flight per `(user_id, session_id, device_id)`.
- An invalidation with version `N` atomically marks any cache entry below `N` unusable.
- A resolution response with version below the cache’s observed version is discarded.

## 3. Mediator Protocol and Storage

### Declarative message contract

Each YAML message declaration defines:

- Stable message ID and schema version.
- Mode: `forward`, `single`, `multiple`, `stream`, `scheduled`, or `control`.
- Source and permitted destination services.
- Request/event and response schemas.
- Partition-key expression.
- Timeout, maximum causation depth, retry policy, and dead-letter policy.
- Idempotency requirements.
- Subscribers and consumer-group identities.
- Logging metadata, redaction paths, body size limit, and retention.
- Intentional route re-entry allowance, defaulting to none.

The wire envelope contains:

- `protocol_version`
- `mode`
- `message_id` and `message_version`
- `source_service`, `source_instance`, and `destination_service`
- `partition_id` and optional affinity/partition key
- `idempotency_key`
- `created_at`, `deadline_at`, and `attempt`
- `traceparent`, `tracestate`, `correlation_id`, and `causation_id`
- Mediator-managed `route_path` and causation depth
- Typed headers and payload

### Forwarding behavior

- Med maintains a live routing registry from authenticated service heartbeats.
- Any ingress node can accept a call and relay it through the mediator mesh to the node owning the selected service connection.
- Target selection uses two healthy candidates and chooses the lower inflight/latency score. Affinity routes use rendezvous hashing.
- If the target disconnects:
  - Non-idempotent calls fail with `MED_TARGET_LOST`.
  - Idempotent calls retry while the propagated deadline and retry budget permit.
- Caller cancellation propagates to the target. A late response is traced and discarded.
- Require at least one eligible target before accepting the forward request.

### Durable partition behavior

- Use 256 virtual partitions initially; map message keys to partitions with a stable hash.
- Assign three replicas with rendezvous hashing.
- The partition leader appends checksummed WAL records, replicates them, and acknowledges after quorum-two fsync.
- Lease defaults:
  - Six-second lease.
  - Renewal every two seconds.
  - Promotion permitted only after lease expiry and successful fencing-token CAS.
  - Duration uses monotonic clocks; lease authority uses control-store time.
- The control store is sharded by partition ID and contains only leases, fencing tokens, committed high-watermarks, replica state, consumer offsets, and deduplication metadata.
- WAL records include length, version, partition, offset, message ID, payload checksum, and record checksum.
- Recovery truncates only an incomplete or invalid tail. Corruption inside the committed range quarantines the replica and prevents leadership.
- Compact committed WAL ranges into immutable per-partition Parquet files. Write temporary file → fsync → checksum → atomic rename → publish manifest CAS → release obsolete WAL.
- Consumer acknowledgement state tracks gaps. The committed consumer offset advances only when all earlier offsets are settled.
- A redelivered attempt carries a new delivery-attempt ID and the same message ID/idempotency key.
- A transactional service inbox records message ID before committing business effects. Duplicate attempts return the stored outcome or acknowledge without replaying the mutation.

## 4. Test Architecture Required Before Feature Work

### Deterministic test seams

Introduce injectable interfaces before implementing cluster logic:

- `Clock`: wall time and monotonic time.
- `Scheduler`: controlled task/yield ordering.
- `RandomSource`: IDs, retry jitter, and routing choices.
- `NetworkTransport`: send, receive, disconnect, delay, duplicate, reorder, and drop.
- `WalDevice`: append, fsync, truncate, partial write, corruption, disk-full, and delayed completion.
- `ControlStore`: CAS, shard availability, stale read simulation, and database time.
- `ReplicaTransport`: append, commit, snapshot, and recovery messages.
- `TraceSink`: normal, slow, unavailable, and backpressured.
- `AuthStateClient` and `JwksFetcher`: controllable responses and delays.

Every race test records seed, scheduler decisions, node state, and virtual timestamps. A failing run must be replayable from one command and one seed.

### Reference models

- Build a small in-memory Auth model defining sessions, devices, revisions, refresh generations, and valid authorization outcomes.
- Build a mediator partition model defining leader epoch, committed log, replica logs, inflight deliveries, acknowledgement gaps, and consumer checkpoints.
- Run generated operation sequences against the model and implementation:
  - Publish
  - Replicate
  - Elect
  - Crash/recover
  - Compact
  - Deliver/ack/nack/timeout
  - Revoke/resolve/invalidate
  - Refresh token
  - Advance time
- After every generated step, assert all invariants rather than checking only final output.
- Add a property-testing dependency such as `fast-check`; persist minimized counterexamples as regression fixtures.

## 5. Detailed Race and Inconsistency Test Matrix

### Auth cache and invalidation races

- Invalidation arrives before an older `auth.session.resolve` response: older response must be rejected.
- Resolution begins before permission commit and returns afterward: version comparison must prevent stale overwrite.
- Two permission changes commit rapidly and invalidations arrive in reverse order: highest version wins.
- Cache expiry and request authorization occur at the same virtual timestamp: `age >= 30s` fails closed.
- One hundred requests hit an expired cache entry simultaneously: exactly one resolution call occurs; all requests share its result or failure.
- Auth becomes unavailable during refresh: no stale extension occurs.
- Med reconnect replays old invalidations: processing remains idempotent.
- Logout, password change, device revocation, and permission removal race with active reads and mutations. Validate the documented commit/observation boundary.
- Cache eviction during inflight resolution must not resurrect an entry.
- A service restart with an empty cache must fail closed until successful resolution.

### Refresh-token races

- One hundred concurrent uses of the same refresh generation produce exactly one new generation.
- Repeated same-idempotency-key calls return one stable result.
- Different keys inside the five-second race window return conflict without multiple descendants.
- Reuse after the race window revokes the family once and emits one logical invalidation despite retries.
- Database timeout after commit but before response: retry retrieves the committed idempotent result.
- Outbox publisher crash after publishing but before marking sent: duplicate invalidation is harmless.
- Device revocation concurrent with refresh: no new active token may survive a higher committed device revision.

### JWKS and token timing

- One hundred unknown-`kid` validations trigger one network refresh.
- Old and new keys validate during overlap; the old key fails only after its token lifetime and overlap expire.
- JWKS refresh completes after a newer refresh: older document cannot replace newer key state.
- Validate exact `nbf`, `iat`, `exp`, cache-max-age, and clock-skew boundaries at `-1ms`, exact boundary, and `+1ms`.
- Simulate service clocks at ±60 seconds and beyond tolerance.
- Reject algorithm-confusion attempts, duplicate `kid`, malformed EC points, wrong curve, wrong issuer, and wrong audience.
- A slow or malicious JWKS endpoint cannot block unrelated cached-key validations.

### Mediator publish and quorum races

Inject failure at every publish transition:

1. Before leader append.
2. During partial WAL write.
3. After leader append but before fsync.
4. After leader fsync but before replication.
5. After one follower append but before follower fsync.
6. After quorum fsync but before commit marker.
7. After commit marker but before client acknowledgement.
8. After acknowledgement is sent but before client receives it.

For each point, verify:

- Unacknowledged messages may be retried but cannot appear as two logical records.
- Acknowledged messages survive leader loss.
- Recovery agrees with the quorum-committed high-watermark.
- Retrying the same message ID returns the original partition/offset.
- No offset is reused for a different message.

### Election, fencing, and partition races

- Two candidates attempt promotion simultaneously: one fencing-token CAS succeeds.
- Old leader resumes after network partition: every follower rejects its stale fencing token.
- Lease renewal and takeover happen at the same database timestamp.
- Control-store response is delayed beyond lease expiry.
- One replica has a longer uncommitted tail than quorum; promotion truncates it safely.
- One replica is behind the committed watermark; it cannot become leader until repaired.
- Membership changes during publish, replication, and compaction preserve the active replica set for the current epoch.
- Rebalance 256 partitions while publishing at target rate; preserve per-partition ordering and acknowledged durability.
- Database shard failure affects only its partitions and must stop new commitments rather than permit split-brain.

### Delivery, acknowledgement, and consumer races

- Offsets 10 and 12 acknowledge before 11: checkpoint stays at 10 until 11 settles.
- Ack arrives exactly as visibility timeout expires.
- Consumer disconnects after business commit but before ack: redelivery occurs, inbox prevents duplicate effect.
- Old consumer finishes after reassignment: stale delivery-attempt fencing prevents settlement.
- Scale a `single` group from one to 32 instances and back while processing.
- For `multiple`, verify every declared service group receives every committed message while replicas inside a group do not all process it.
- Subscriber added after publication starts from its declared policy: latest, timestamp, or beginning.
- Poison messages exhaust retry policy, enter the dead-letter stream once, and do not block later partition records unless strict ordering is declared.
- Retry delay uses jitter but never exceeds message deadline.

### Forward-proxy races

- Target disconnect before receiving, during processing, and while returning response.
- Caller cancels while route selection, relay, or response is in progress.
- Deadline expires one millisecond before and after target response.
- Target sends duplicate or contradictory responses; only the first valid response settles the call.
- Idempotent retry reaches a different instance and returns the stored result.
- Non-idempotent forward is never replayed.
- Service deregisters and re-registers with the same instance ID but a newer connection epoch; old frames are rejected.
- Route ancestry repeats concurrently through multiple mediator nodes; cycle rejection remains deterministic.

### WAL, Parquet, and recovery races

- SIGKILL during WAL append, fsync, segment conversion, manifest update, and WAL deletion.
- Disk-full before and after quorum. Never acknowledge without the required durable replicas.
- Corrupt WAL tail, committed WAL body, Parquet footer, checksum, and manifest.
- Reader opens a segment while compaction publishes it.
- Retention races with active history readers and trace-dashboard queries.
- Two compactions for the same range: manifest CAS permits one result.
- Restart all three nodes in every order and compare recovered logs byte-for-byte with the committed reference model.
- Verify Parquet segment boundaries independently from delivery throughput; compaction success must not mask consumer backlog.

### Sharding and directory consistency

- Concurrent user creation with the same normalized email on different directory replicas yields one winner.
- Directory mapping commits but user-shard creation fails, and the inverse failure order.
- Repair jobs converge incomplete mappings idempotently.
- Reshard using directory epochs and dual-read routing; stale epochs redirect rather than create duplicate users.
- Requests during shard movement resolve either the old or new authoritative copy, never a partially copied security state.
- Run the CAS contract suite against DuckDB and PostgreSQL on every PR, MySQL nightly, and Oracle/SQL Server in release validation.

## 6. Timing, Load, and Chaos Gates

### Certified medium-cluster profile

Reference environment:

- Three mediator nodes, each at least 4 vCPU, 8 GB RAM, and local NVMe-class storage.
- Three replicas each for Auth, gateway, and representative domain services.
- At least three logical Auth/control-store shards.
- 256 mediator partitions.
- Typical payload: 1 KiB; test mixes also include empty, 16 KiB, 256 KiB, and maximum-size messages.

Required load:

- 10,000 concurrent service/client connections.
- 2,000 `forward` requests/second.
- 5,000 durable messages/second.
- 100 million retained event/trace rows.
- `single` plus at least four `multiple` subscriber groups.
- Continuous key rotation, permission mutation, cache refresh, compaction, and dashboard queries during load.

### Acceptance thresholds

- Zero acknowledged-message loss.
- Zero unauthorized acceptances after the 30-second security-state bound.
- Zero duplicate business effects when the inbox contract is used.
- Zero partition-order violations.
- Zero stale-leader commits.
- Healthy invalidation propagation: p99 ≤ 2 seconds.
- Leader failure recovery: new commitments resume within 10 seconds.
- Forward mediator overhead on the reference LAN: p99 ≤ 15 ms excluding service time.
- Quorum durable publish acknowledgement for 1 KiB payloads: p99 ≤ 40 ms.
- Backlog recovery rate: at least twice the sustained ingress rate after a 10-minute consumer outage.
- Trace collection enabled must reduce throughput by less than 10% and must never block routing.
- After warm-up, process memory must not show sustained growth greater than 5% over the 24-hour soak.
- No open socket, timer, cursor, pending-request, file-handle, or temporary-segment growth after clients disconnect.

### Test cadence

- Every PR:
  - Unit, schema, CAS, protocol, deterministic scheduler, and property tests.
  - At least 200 generated seeds per state machine.
  - Multi-process smoke with three med nodes and forced leader loss.
  - Maximum duration target: 15 minutes.
- Nightly two-hour chaos:
  - At least 10,000 generated state-machine histories.
  - Continuous process kills, network delay/drop/reorder, control-shard outages, disk latency, clock skew, and compaction.
  - Medium load ramp followed by recovery verification.
- Release candidate 24-hour soak:
  - Full certified medium-cluster load.
  - Random failure every 5–15 minutes.
  - Auth key rotations, reshard simulation, rolling deployments, partition rebalances, disk pressure, and trace queries.
  - Final offline reconciliation of published IDs, quorum logs, Parquet rows, consumer inboxes, offsets, dead letters, and trace records.
- Preserve all failure seeds, event histories, node logs, and timing decisions as CI artifacts.

## 7. Trace Dashboard Validation

- Use W3C `traceparent` and `tracestate` across HTTP, mediator, retries, and consumers.
- Dashboard must expose waterfall, routing graph, causation chain, retries, cycles, partition ownership, replica lag, consumer lag, cache refresh failures, and DLQ state.
- Test trace completeness by comparing expected spans from the reference operation history with stored and OTLP-exported spans.
- Delay or disable the trace sink under full load; message routing must remain within its correctness guarantees.
- Fuzz redaction rules with nested passwords, tokens, authorization headers, cookies, malformed JSON, binary bodies, and oversized payloads.
- Captured bodies remain opt-in, redacted, truncated, and retained for 24 hours; trace metadata defaults to seven days.
- Dashboard queries over 100 million rows must remain bounded by time range and pagination and must not scan unrestricted history.

## 8. Phased Delivery and Exit Gates

1. **Testability foundation**
   - Add injectable clock, scheduler, storage, control-store, network, and trace interfaces.
   - Add reference models, property tests, failure-seed replay, and invariant checker.
   - Exit only when existing single-node behavior passes through the new seams.

2. **Auth security**
   - Add ES256/JWKS, persistent sessions/devices/revisions, refresh rotation, local KV, outbox, and fail-closed resolution.
   - Exit after all Auth race tests and a med/Auth outage test prove the 30-second bound.

3. **Message protocol**
   - Add declarative modes, direct forward relay, deadlines, cycle detection, redaction, inbox/outbox, and partition offsets on one mediator node.
   - Exit after deterministic delivery/acknowledgement tests and compatibility tests pass.

4. **Process extraction**
   - Split gateway, Auth, Order, and Chat into independent processes with mTLS workload identities.
   - Exit after rolling restarts, scale-out, service discovery churn, and end-to-end permission/device tests.

5. **Replicated mediator**
   - Add WAL, replica protocol, quorum commits, lease/fencing CAS, partition rebalancing, and Parquet compaction.
   - Exit after nightly chaos produces no invariant violations for seven consecutive runs.

6. **Scale certification and dashboard**
   - Run the full medium profile, dashboard, OTLP export, and 24-hour release soak.
   - Remove HS256, global sequence, monolithic-host, and legacy RPC compatibility only after reconciliation reports zero loss, skipped offsets, or unauthorized decisions.

## Assumptions

- PostgreSQL is the first durable adapter, but correctness relies only on transactions, unique constraints, conditional row-version updates, and database time—not database locks.
- Auth shards use user-ID hashing plus a separately sharded email directory.
- Mediator durability is three replicas with quorum two.
- The security cache hard expiry is 30 seconds; healthy invalidation target is two seconds p99.
- The initial certified scale is 10,000 connections, 2,000 forward requests/second, 5,000 durable messages/second, and 100 million retained rows.
- PR deterministic tests, nightly two-hour chaos, and a 24-hour release soak are mandatory gates.
