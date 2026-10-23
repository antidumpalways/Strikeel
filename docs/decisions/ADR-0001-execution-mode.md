# ADR-0001 — Simulation-first execution under the restricted-jurisdiction policy

- **Status:** Partially verified — Discord confirmation on file; live mainnet scope pending
- **Date:** 2026-10-20
- **Deciders:** Project owner (human), orchestrator
- **Related:** `docs/context/project-brief.md`, `docs/architecture/overview.md`

## Context

STRIKEEL is a submission for the Strike Hackathon. The strongest form of integration is actual order execution through Strike, but execution is a regulated capability, not a feature flag.

Strike's Restricted Persons policy (last updated October 2026, `https://www.strikefinance.org/restricted`) lists **Indonesia** among its regulatory-restriction jurisdictions. The policy states that the services are not available to persons resident in, located in, or subject to a restricted jurisdiction, and that circumvention (VPN/proxy) is prohibited. The policy also covers Indonesia-based entities and persons acting for their benefit.

Two facts follow:

1. A successful `GET` on a public API endpoint does not create trading authorization.
2. Testnet is still a Strike-operated service; it is not a compliance exemption.

The hackathon rewards meaningful Strike integration, including execution, but submitting signed orders from a restricted jurisdiction would violate the venue's policy and put the submission at risk. Compliance takes precedence over demo impact.

## Options

| Option | Description | Verdict |
|---|---|---|
| A. Live/testnet trading | Connect an API wallet and submit orders | Rejected under current policy |
| B. Simulation with real Strike data | Implement the full integration and state machine, but never submit an order; paper-fill against the live order book | **Selected** |
| C. Read-only dashboard | Only display Strike prices/positions | Rejected: too weak for the product thesis |

## Decision

Adopt **Option B — simulation-first**.

- `EXECUTION_MODE=simulate` is the default and the only enabled mode.
- The Strike adapter implements real authentication, order preparation, margin math, and the execution state machine, but the submission transport refuses to call `POST /v2/order` unless an explicit, reviewed authorization path is enabled.
- No Strike API wallet key is required for the demo. If one exists, it is not used for order submission.
- Simulated fills are generated deterministically from the live order book and are labeled `SIMULATED` in the UI, API, database, audit log, and demo script.
- Enabling live execution requires all of:
  1. written confirmation from Strike that the participant/account is eligible;
  2. a new ADR superseding this one;
  3. security review (security-auditor + human) of key handling and mandate enforcement;
  4. an explicit environment gate, not a UI toggle.

### Decision update — 2026-10-20 (owner)

The project owner selected **mainnet-only** operation. This means:

- market data comes from `https://api.strikefinance.org` only;
- **no testnet endpoints are used in the demo** (owner choice); the 2026-10-21 Discord reply permits testnet, but it is not needed for a mainnet-data demo;
- execution remains **simulated** because live mainnet trading is still not explicitly authorized;
- "mainnet-only" does **not** authorize live mainnet orders. Live trading would require explicit written permission and a superseding ADR.

### Evidence — Strike Discord reply (2026-10-21)

The owner provided a screenshot of a reply from **“Shan | Strike Finance”** to our five eligibility questions:

> Yeah man, go ahead all good 🫡

Scope covered by that reply: hackathon participation/submission, read-only mainnet data, testnet order demo, and simulation acceptability. The question set did **not** ask about **live mainnet order submission**, so it is not covered. Live mainnet remains disabled pending an explicit one-line confirmation in the same thread. The reply is a casual Discord message, not a legal opinion; preserve the screenshot with the submission evidence.

## Rationale

- Preserves the product's core dependency on Strike: market metadata, funding, depth, margin, hedge sizing, intent lifecycle, and reconciliation all use real Strike data.
- Keeps the demo honest and auditable; judges can see exactly where execution would occur.
- Avoids a policy violation that could disqualify the project or expose the operator.
- Produces reusable infrastructure: flipping to live later is a transport change, not a redesign.

## Consequences

**Positive**

- No regulatory/key risk during the hackathon.
- The hardest parts (risk engine, margin math, state machine, reconciliation, audit) are still demonstrated.
- Works without a builder code or API wallet; no testnet is used.

**Negative**

- The demo cannot claim actual fills or on-chain execution; the submission must describe it as a working prototype with simulated execution.
- Judging criterion "Integration with Strike" is partially satisfied by authenticated-read design and order-lifecycle implementation, not live order flow.
- A future live mode still needs key management, policy enforcement, and incident response.

## Guardrails (must be enforced in code and review)

1. One `ExecutionMode` type; no ad-hoc boolean flags.
2. The simulate transport has no code path to `POST /v2/order`; a test asserts zero calls.
3. API responses and UI carry `executionMode` and `simulated: true` for paper orders/fills.
4. No API wallet private key is generated, stored, or requested in the demo.
5. Security gate checks for secrets, bypass flags, and misleading copy.
6. Demo script and README state: "Execution is simulated. No orders were sent to Strike."

## Follow-ups

1. Ask Strike (Discord/team) for written guidance on live/mainnet trading eligibility for Indonesia-based participants. Testnet is not used. Record the answer in this ADR.
2. If permission is granted, write ADR-0006 (live execution) covering key custody, mandate enforcement, rate limits, kill switch, and reconciliation.
3. Before any live mode: implement KMS-backed signing, per-strategy locks, and an independent security audit.
