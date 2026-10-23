# Master Spec Traceability

- **Status:** Active — Phase 1 fidelity pass
- **Date:** 2026-10-20
- **Source of truth:** `Strikeel.txt` v1.0 (59 sections, Parts I–XVI)
- **Rule:** every master section must be `Covered`, `Partial`, `Slice`, or `Deferred` with a destination. No silent omissions.
- **Owner decisions (2026-10-20):** mainnet-only (no testnet); three chains mandatory for submission (Ethereum, Solana, Cardano); build order EVM → SOL/ADA; execution simulated.

## Status legend

| Status | Meaning |
|---|---|
| **Covered** | Batch 1 contains enough detail to act without re-reading the master |
| **Covered with deviation** | Covered, but batch 1 intentionally differs from the master; the deviation is recorded in an ADR |
| **Slice** | Planned for (and, once built, implemented in) the named hackathon slice |
| **Partial** | Direction captured; detail/implementation lands later |
| **Deferred** | Intentionally post-hackathon; tracked with a destination |

## Coverage map

| § | Master section | Status | Destination / note |
|---|---|---|---|
| 1 | Executive summary | Covered | `project-brief.md` §1 |
| 2 | Core problem | Covered | `project-brief.md` §2 |
| 3 | Vision, mission, principles | Covered | `project-brief.md` §1; `AGENTS.md` invariants |
| 4 | Brand identity | Partial | Tagline/positioning in brief; full brand guide in slice 005; trademark/domain check deferred |
| 5 | Target users | Covered | `project-brief.md` §3 (P0–P3) |
| 6 | Jobs to be done | Covered | `project-brief.md` §3 |
| 7 | Value proposition | Covered | `project-brief.md` §3–§4 |
| 8 | Supported chains | Slice | **Three chains required for submission**; slice 001 EVM, slice 003 SOL/ADA |
| 9 | Unified identity | Deferred | Slice 003; read-only address import is the fallback for the demo |
| 10 | Position indexer + model | Partial | `overview.md` §2.2/§3.2; slice 001 subset |
| 11 | Protocol adapters | Partial | `overview.md` §2; slice 001 Uniswap V3; slice 003 SOL/ADA (**required**) |
| 12 | Exposure engine | Partial | Scope 001 AC1–AC3; stress/gamma later |
| 13 | Concentrated liquidity | Slice | Scope 001 AC1–AC2 |
| 14 | Hedge optimizer | Partial | Scope 001 basic rule/constraints; advanced objective post-hackathon |
| 15 | Adaptive rebalancing | Deferred | Slice 004 |
| 16 | Scenarios/stress testing | Deferred | Post-hackathon; deterministic preview only in MVP |
| 17 | Strike integration strategy | Covered | `overview.md` §5 |
| 18 | Strike account connection | Partial | Design in overview; no auth in demo; slice 003 |
| 19 | Trading mandates | Partial | `overview.md` §2.2; full mandate schema slice 002 |
| 20 | Reliable order execution | Partial | State machine in overview §7; simulator slice 002 |
| 21 | Account and margin | Partial | Overview §5.5; estimate in slice 001; guardian slice 004 |
| 22 | High-level architecture | Covered | `overview.md` §1–§3 |
| 23 | Technology stack | Covered with deviation | `ADR-0002` (monolith/SQLite now; master stack production target) |
| 24 | Bounded contexts | Covered | `overview.md` §2.1 |
| 25 | Database architecture | Partial | `overview.md` §3.2 subset; full schema later |
| 26 | Event-driven workflow | Partial | `overview.md` §3.1; event bus post-hackathon |
| 27 | Product navigation | Partial | `overview.md` §4.1; slice 005 |
| 28 | Landing page | Deferred | Slice 005 |
| 29 | Dashboard overview | Partial | Slice 001 minimal cards |
| 30 | Portfolio screen | Slice | Scope 001 |
| 31 | Exposure screen | Slice | Scope 001 (net delta only; stress deferred) |
| 32 | Hedge Studio | Slice | Scope 001 steps 1–4; authorize/activate slice 002 |
| 33 | Live strategy monitor | Deferred | Slice 002/004 |
| 34 | Risk Center | Deferred | Slice 004 |
| 35 | Activity and audit | Partial | Decision log slice 001; full timeline slice 002 |
| 36 | STRIKEEL SDK | Deferred | Post-hackathon |
| 37 | Proposed REST API | Deferred | Internal BFF only in MVP; public API post-hackathon |
| 38 | Webhooks | Deferred | Post-hackathon |
| 39 | Security requirements | Partial | `AGENTS.md` + gates; implementation review slice 003 |
| 40 | Failure handling matrix | Partial | `overview.md` §8; expand per adapter |
| 41 | Compliance | Covered | `ADR-0001` |
| 42 | Testing strategy | Partial | Scope 001 §5 + quality gates; full matrix later |
| 43 | End-to-end acceptance | Partial | Scope 001 AC; full 3-chain scenario is mandatory before submission |
| 44 | Non-functional requirements | Partial | Constraints in brief; SLOs after measurement |
| 45 | Repository structure | Covered | `AGENTS.md` §7 |
| 46 | Parallel workstreams | Covered | `docs/agents/workstreams.md` |
| 47 | Development phases | Partial | `overview.md` §10.2 mapped to slices |
| 48 | Revenue model | Deferred | Post-hackathon / submission narrative |
| 49 | Value to Strike | Partial | Brief positioning; submission copy in slice 005 |
| 50 | Competitive positioning | Deferred | Landing + submission slice 005 |
| 51 | Product metrics | Partial | `project-brief.md` §9 north star + families |
| 52 | What STRIKEEL is not | Covered | `project-brief.md` §5 |
| 53 | Critical assumptions | Covered | `project-brief.md` §7–§8 |
| 54 | Project title | Covered | `project-brief.md` header |
| 55 | Submission description | Deferred | Slice 005 (draft from brief) |
| 56 | Judging alignment | Partial | Brief; final mapping slice 005 |
| 57 | Demonstration narrative | Partial | Scope 001/005; simulation labels mandatory |
| 58 | Architecture decision register | Partial | ADR-0001, ADR-0002; add as decisions land |
| 59 | Final product definition | Covered | `project-brief.md` + `AGENTS.md` |

## Gaps that must not be forgotten

1. **Identity/auth** (§9) — required before real user data; slice 003.
2. **Solana + Cardano adapters** (§8, §11) — **required for submission**, not optional; slice 003.
3. **Full mandate schema** (§19) — required before any authorize/execute flow; slice 002.
4. **Stress testing** (§16) — required for "risk OS" credibility; post-hackathon.
5. **SDK/API/webhooks** (§36–38) — future moat; post-hackathon.
6. **Submission package** (§54–57) — README, demo video, judging map; slice 005.

## Change control

- If `Strikeel.txt` changes, update this map first, then the affected docs/scopes.
- A new section in the master must get a status and destination in the same change.
- "Deferred" is a decision, not a gap; it must name the slice or post-hackathon owner.
