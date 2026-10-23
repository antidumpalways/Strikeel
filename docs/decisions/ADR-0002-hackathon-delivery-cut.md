# ADR-0002 â€” Hackathon delivery cut: modular monolith, SQLite, no queue

- **Status:** Proposed (requires human approval)
- **Date:** 2026-10-20
- **Deciders:** Project owner (human), orchestrator
- **Related:** master spec Â§23, Â§45, Â§47; `docs/architecture/overview.md`

## Context

The master blueprint recommends a production stack of Fastify, PostgreSQL, Redis, BullMQ, an always-on execution worker, a reconciliation worker, and KMS/HSM-backed keys. That stack is appropriate for the product described in `Strikeel.txt`, but the hackathon gives roughly 48 hours, a solo builder, and a simulation-only execution mode under the restricted-jurisdiction policy (ADR-0001).

The risk is building infrastructure instead of demonstrating the product thesis: cross-chain exposure â†’ capital-aware hedge â†’ Strike execution lifecycle.

## Options

| Option | Description | Trade-off |
|---|---|---|
| A. Full production stack now | Fastify + Postgres + Redis + BullMQ + workers + KMS | High setup and failure surface; unlikely to finish the vertical slice |
| B. Throwaway prototype | Single script + mocked data | Fast, but no credible boundaries, tests, or path to production |
| C. Modular monolith | Next.js route handlers, pure TS domain packages, SQLite (
ode:sqlite) demo store, CLI reconciliation | Fast, preserves boundaries, migratable; lacks long-running automation |

## Decision

Adopt **Option C** for the hackathon:

- `apps/web` (Next.js) owns UI and same-origin route handlers.
- `packages/core` contains pure, network-free domain logic.
- `packages/adapters/*` isolate chain, protocol, and Strike I/O.
- `packages/db` uses Drizzle with SQLite; schema avoids SQLite-only constructs where practical.
- No Redis, BullMQ, separate API server, or always-on worker in slices 001â€“002.
- Reconciliation is a CLI/manual job (`tools/reconcile`) that operates on durable `execution_intents`.
- No trading keys and no KMS; simulation mode requires neither.

The master stack remains the **production target**, not a rejected design. This ADR records a time-boxed cut, not a permanent architecture change.

## Rationale

- Fewer moving parts means fewer untested failure modes in a 48-hour window.
- A same-origin BFF removes CORS, auth-cookie, and deployment complexity.
- SQLite makes the demo reproducible on any machine and keeps fixtures portable.
- Pure domain packages can be extracted to Fastify/workers later without rewriting risk math.
- The durable intent table already models the state needed for a future queue.

## Consequences

**Positive**

- Faster path to a working, testable vertical slice.
- Deterministic local demo; no managed services or secrets required.
- Clear package boundaries for parallel agent work.

**Negative / accepted risks**

- No long-running autonomous rebalancing during the demo; triggers are manual/CLI.
- SQLite has single-writer constraints; not suitable for multi-user production.
- Serverless request timeouts limit indexing duration; large wallets may need pagination.
- The demo must not be described as production-ready or highly available.
- KMS/key-management requirements remain unproven until live execution is authorized.

## Revisit triggers

Replace this ADR when any of the following occurs:

1. Written authorization for live execution (mainnet).
2. A requirement for continuous background rebalancing or monitoring.
3. More than one concurrent writer or multi-tenant production use.
4. Indexing volume or latency that exceeds a single process/SQLite.
5. A hosted public demo that needs managed Postgres and durable workers.

## Migration path

1. Swap SQLite for PostgreSQL (Drizzle dialect + migrations).
2. Extract route handlers into a Fastify service if independent scaling is needed.
3. Add BullMQ/Redis and a worker that consumes `execution_intents` and reconciliation jobs.
4. Introduce KMS-backed signing and per-strategy locks before any live order.
5. Keep the same domain interfaces and event contracts to avoid a rewrite.

