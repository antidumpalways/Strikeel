# Validation Log

- **Purpose:** Append-only record of reviews, verdicts, escalations, and sign-offs.
- **Rules:** never delete or rewrite an entry; corrections are new entries referencing the old ID.
- **Related:** `docs/agents/validation-protocol.md`, `docs/agents/quality-gates.md`, `docs/agents/handoff-contract.md`

## Entry template

```markdown
## Entry <NNN> ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â <scope / milestone>

- **Date:** YYYY-MM-DD HH:MM UTC
- **Scope:** <scope id + title>
- **Handoff:** <path or "n/a">
- **Cycle:** <1|2|3>
- **Execution mode:** read-only | simulate | live (ADR required)
- **Reviewers:**
  - <role> ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â <PASS|PASS_WITH_NOTES|FAIL> ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â <evidence path>
  - <role> ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â <verdict> ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â <evidence>
- **Findings:**
  - [SEVERITY] <id> ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â <issue> ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â <status: open|fixed|accepted>
- **Gates:** G0 <PASS/FAIL>, G1 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦, G8 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦
- **Decision:** <signed off | changes requested | escalated to human>
- **Human approval:** <pending | approved by ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ | rejected>
- **Notes:** <rationale, links>
```

## Entry 000 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Phase 1 documentation baseline

- **Date:** 2026-10-20
- **Scope:** Phase 1, documentation batch 1 (no product code)
- **Handoff:** n/a
- **Cycle:** 0
- **Execution mode:** read-only / simulate (ADR-0001 proposed)
- **Reviewers:** none yet ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â human review pending
- **Findings:** none raised
- **Gates:** not run (docs only). G0/G5/G6 will apply at review; no build/test exists yet.
- **Decision:** awaiting human approval of the context pack and scope 001
- **Human approval:** pending
- **Notes:**
  - Files created: `docs/context/project-brief.md`, `docs/architecture/overview.md`, `docs/decisions/ADR-0001-execution-mode.md`, `docs/scopes/001-exposure-to-hedge-preview.md`, `docs/agents/validation-protocol.md`, `docs/agents/quality-gates.md`, `docs/agents/handoff-contract.md`, `docs/agents/validation-log.md`, `AGENTS.md`.
  - Verified facts: Strike API reachable; public market endpoints return 200; Indonesia is listed in Strike's restricted-jurisdiction policy.
  - No product code, dependencies, or secrets were created.
  - Next: batch 2 (local agent tooling), then scope 001 implementation after approval.

## Entry 001 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Phase 1 fidelity pass (master spec alignment)

- **Date:** 2026-10-20
- **Scope:** Phase 1 documentation fidelity against `Strikeel.txt` v1.0 (59 sections)
- **Handoff:** n/a
- **Cycle:** 0
- **Execution mode:** read-only / simulate
- **Reviewers:** none yet ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â human review pending
- **Findings:**
  - [HIGH] State machine omitted `SUBMISSION_IN_PROGRESS` from master ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§20 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â **fixed** in `overview.md` ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§7.
  - [HIGH] No traceability from master sections to docs ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â **fixed** via `docs/context/traceability.md`.
  - [HIGH] Stack deviation (ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§23) was implicit ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â **fixed** via `ADR-0002`.
  - [MEDIUM] Workstream ownership (ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§46) missing ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â **fixed** via `docs/agents/workstreams.md`.
  - [MEDIUM] Full UX/business/SDK sections not in batch 1 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â **accepted as deferred**, now mapped.
- **Gates:** G0/G5/G6 apply; no build/test exists yet.
- **Decision:** awaiting human approval; no product code started
- **Human approval:** pending
- **Notes:**
  - Changed: `project-brief.md` (source-of-truth, full scope table, JTBD, metrics, references), `overview.md` (contexts, domain objects, events, data model, UX surfaces, margin math, rebalancing, state machine, phases, ADR links), `AGENTS.md` (source-of-truth + workstreams link).
  - Added: `docs/context/traceability.md`, `docs/decisions/ADR-0002-hackathon-delivery-cut.md`, `docs/agents/workstreams.md`.
  - All 59 master sections now have a status and destination. Remaining work is scoped, not silently dropped.

## Entry 002 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Phase 1 batch 2 (local agent tooling) + owner decisions

- **Date:** 2026-10-20
- **Scope:** Phase 1 batch 2; owner decisions: mainnet-only, three-chain mandatory
- **Handoff:** n/a
- **Cycle:** 0
- **Execution mode:** simulate (mainnet reads only; no testnet)
- **Reviewers:** none yet ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â human review pending
- **Findings:** none raised; tooling is local and gitignored
- **Gates:** not run (no product code)
- **Decision:** awaiting human approval of slice 001; agent config is ready
- **Human approval:** batch 2 approved; slice 001 pending
- **Notes:**
  - Created local tooling: `.opencode/agent/{orchestrator,builder,contracts-reviewer,security-auditor,frontend-reviewer,qa-validator,strike-reviewer,arbiter}.md`, `.opencode/command/{validate,gate,handoff}.md`, `opencode.json`, `.gitignore`.
  - `.opencode/` and `opencode.json` are gitignored; they are not product artifacts.
  - Verified: `opencode debug agents` lists the 8 project agents; `opencode run --standalone --agent orchestrator` returned `ORCHESTRATOR_OK`; `--agent builder` returned `BUILDER_OK`; `opencode debug config` shows the project `opencode.json` loaded.
  - Updated docs for mainnet-only + three-chain decisions: `project-brief.md`, `traceability.md`, `workstreams.md`, `overview.md`, `ADR-0001`, `scope 001`.
  - Restart opencode to load the new agents/commands; the running session uses the old config.
  - No product code, dependencies, or secrets created.

## Entry 003 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Strike eligibility evidence (Discord)

- **Date:** 2026-10-21
- **Scope:** eligibility / execution mode
- **Handoff:** n/a
- **Cycle:** 0
- **Execution mode:** simulate (mainnet read-only)
- **Reviewers:** human-provided evidence; no agent review required yet
- **Findings:**
  - [INFO] ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œShan | Strike FinanceÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â replied to our 5 questions: ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œYeah man, go ahead all good ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â«ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â **recorded** in `ADR-0001`.
  - [OPEN] The question set covered participation, read-only mainnet, testnet, and simulation ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â **not live mainnet orders**. Awaiting one-line scope confirmation.
- **Gates:** n/a (docs/evidence only)
- **Decision:** simulate remains default; live mainnet stays disabled
- **Human approval:** owner asserts all permitted; live scope pending explicit confirmation
- **Notes:**
  - Evidence is a Discord screenshot; keep it with submission materials.
  - If Shan confirms live mainnet in the thread, write a superseding ADR and update `project-brief.md`, `AGENTS.md`, and the orchestrator/builder/strike/security prompts.

## Entry 004 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Builder code registered

- **Date:** 2026-10-22
- **Scope:** Strike Builder integration prerequisite
- **Handoff:** n/a
- **Cycle:** 0
- **Execution mode:** simulate (no orders)
- **Reviewers:** dashboard evidence supplied by owner
- **Findings:**
  - [INFO] Builder code ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œStrikeelÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â is **Active**, max fee **1 bps**, created **2026-10-22**, volume/rewards $0.00.
  - [RESOLVED] Builder **code string is `Strikeel`** (case-sensitive). `POST /auth/builder/request-signature` returned **200** with `fee_share_bps: 0`; lowercase `strikeel` returned **404 builder code not found**.
- **Gates:** n/a (no code)
- **Decision:** builder-code blocker cleared for Builder Connect; fee can be `0` at connect/order
- **Human approval:** owner provided dashboard evidence
- **Notes:**
  - 1 bps is a cap, not a mandatory charge. Use `fee_share_bps: 0` and omit `X-Builder-Fee-Bps` for a free demo.
  - No verify-signature call was made; no account or order was created. The test used a placeholder EVM address and an ephemeral public key.
  - Next test: wallet signature + verify to create an API wallet; then `GET /v2/account` (read-only).

## Entry 005 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Builder Connect end-to-end verified (read-only)

- **Date:** 2026-10-22
- **Scope:** Strike builder connect + API wallet auth
- **Handoff:** n/a
- **Cycle:** 0
- **Execution mode:** read-only; no orders
- **Reviewers:** orchestrator; evidence below
- **Findings:**
  - [PASS] `request-signature` ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ wallet signature ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ `verify-signature` returned **200**.
  - [PASS] Created throwaway account `01a1619d-ed73-7690-ab53-9ab8db789a88`; API wallet id **622**; public key `90f90acdÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦13def`; expiry `9999-12-31`.
  - [PASS] Signed GETs: `/v2/account`, `/v2/positions` (0), `/v2/openOrders` (0), `/v2/symbols`, `/v2/balances` (USDT 0) ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ all **200**.
  - [INFO] Local clock was ~240 s ahead of Strike; using local time caused `401 signature expired or invalid timestamp`. Use `/v2/time`.
- **Gates:** n/a (integration probe, no product code)
- **Decision:** Block 1 (Strike connect) is proven; trading still requires collateral + explicit live scope
- **Human approval:** owner requested verification
- **Notes:**
  - Test credentials are in `%TEMP%\opencode\strikeel-verify\wallet.json`; never commit or ship. The account has zero balance and no positions/orders.
  - This probe used a throwaway EVM wallet, not the ownerÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢s wallet.
  - Next: wire the verified auth + `/v2/time` logic into `packages/adapters/strike`; no order submission until scope 002.

## Entry 006 ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â Slice 001 implementation (ready for review)

- **Date:** 2026-10-22
- **Scope:** `001-exposure-to-hedge-preview`
- **Handoff:** `docs/scopes/001-evidence.md`
- **Cycle:** 0
- **Execution mode:** simulate / read-only
- **Reviewers:** **none yet** ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â independent review pending after restart; no self-approval
- **Findings:**
  - [OPEN] AC1 needs a recorded real-block fixture in addition to synthetic tests.
  - [OPEN] Persistence (AC7) not implemented; API is computed per request.
  - [OPEN] Wallet connectors not wired; address input only.
  - [OPEN] Solana/Cardano are spot-only in this slice.
- **Gates:**
  - G0 scope/docs ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â PASS (scope + evidence)
  - G1 build/type ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â PASS (`pnpm typecheck`, `next build`)
  - G2 tests ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â PASS (7 files / 21 tests)
  - G3 security ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â NOT REVIEWED (no independent auditor yet)
  - G4 a11y ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â NOT REVIEWED (UI exists)
  - G5 originality ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â PASS by construction (original code, public APIs)
  - G6 evidence ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â PASS (`docs/scopes/001-evidence.md`, `docs/evidence/slice-001.png`, live API log)
  - G7 Strike domain ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â NOT REVIEWED (strike-reviewer pending)
  - G8 data integrity ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â PARTIAL (Decimal + provenance; persistence missing)
- **Decision:** **changes requested / not signed off**; implementation is ready for independent review
- **Human approval:** pending
- **Notes:**
  - Implemented: core decimals/V3 math/exposure/hedge; Strike client with server-clock sync; EVM/Uniswap V3 adapter; Solana SOL/USDC; Cardano ADA; Next.js UI + `/api/preview`; demo CLI.
  - Live evidence: three-chain API 200 with 4 positions, 3 exposures, 3 previews; ETH proposed, SOL blocked `MAX_NOTIONAL`, ADA blocked `BELOW_MIN_ORDER`.
  - No `POST /v2/order`; no orders; no collateral used.
  - Next: restart opencode, run `/validate 001`, fix HIGH findings, then scope 002.
## Entry 007 - Contracts review cycle 1 + arbitration

- **Date:** 2026-10-22
- **Scope:** 001-exposure-to-hedge-preview
- **Cycle:** 1 (contracts) -> arbitration
- **Execution mode:** simulate / read-only
- **Reviewers:** contracts-reviewer -- FAIL (BLOCKER + HIGH findings)
- **Arbitration:** arbiter -- **OVERTURNED** the BLOCKER. Official Uniswap `LiquidityAmounts.sol` confirms `L*(sqrtB-sqrtA)/(sqrtB*sqrtA)` and `L*(sqrtB-sqrtA)`; the reviewer's `(sqrtU+sqrtL)` formula is non-canonical. The repo math is correct.
- **Fixes applied after review:**
  - Zod query validation in `apps/web/app/api/preview/route.ts` (EVM address, token ids, address lengths).
  - Server-side Decimal portfolio total (`portfolioValueUsd`); UI no longer sums with `Number()`.
  - V3 tick passed explicitly from pool state; removed float `log().toNumber()` from the math path.
  - Added `packages/core/test/no-order-path.test.ts` (no `/v2/order`, no builder fee header).
  - Added `LEVERAGE_CAPPED` reason when market cap binds; `HedgeProposal` alias.
  - Mark positions stale at the API boundary; three-chain spot addendum in scope 001.
- **Open findings:**
  - [MEDIUM] `takerFeeBps` hardcoded to 5 bps; documented as an assumption, account fee tier deferred to scope 002.
  - [MEDIUM] AC1 needs a recorded real-block fixture in addition to synthetic tests.
  - [OPEN] Security, Strike, Frontend, QA reviews not yet run.
- **Decision:** changes requested; re-review required. No sign-off.
- **Human approval:** pending
## Entry 008 - Contracts re-review cycle 2

- **Date:** 2026-10-22
- **Scope:** 001-exposure-to-hedge-preview
- **Cycle:** 2 (contracts re-review)
- **Execution mode:** simulate / read-only
- **Reviewer:** contracts-reviewer -- **PASS_WITH_NOTES**
- **Findings:**
  - [MEDIUM] Evidence count drift (recorded 7/21 vs actual 8/22) -- **fixed** in `docs/scopes/001-evidence.md` and `README.md`.
  - [MEDIUM] `takerFeeBps` remains an assumed 5 bps -- accepted follow-up for scope 002.
  - [MEDIUM] AC1 still needs a recorded-block fixture -- accepted follow-up.
  - [LOW] Display-only `Number()` formatting in `apps/web/app/page.tsx` -- accepted; server money math is Decimal.
- **Evidence:** `pnpm typecheck` exit 0; `pnpm test` 8 files / 22 tests; `pnpm --filter @strikeel/web build` success.
- **Decision:** no BLOCKER/HIGH; contracts gate PASS_WITH_NOTES. Security/Strike/Frontend/QA still required.
- **Human approval:** pending

## Entry 009 - Security review

- **Date:** 2026-10-22
- **Scope:** 001-exposure-to-hedge-preview
- **Reviewer:** security-auditor -- **PASS_WITH_NOTES**
- **Findings fixed:** token-id cap, `ownerOf` ownership check, per-source staleness fail-closed, fetch timeouts, postcss audit override (0 vulnerabilities), simulation guard expanded, temp wallet deleted.
- **Open:** fee source assumed, raw upstream warnings, no rate limit for public hosting (deferred to deployment hardening).
- **Evidence:** `pnpm audit --prod` clean; `pnpm typecheck`/`test` pass; no secrets in source; no `/v2/order` path.

## Entry 010 - Strike review

- **Date:** 2026-10-22
- **Scope:** 001-exposure-to-hedge-preview
- **Reviewer:** strike-reviewer -- **PASS_WITH_NOTES**
- **Prior HIGH resolved:** discovery always runs; unpriced chains remain visible as partial/unhedgeable; previews no longer omit them silently (response `unhedgeable[]`).
- **Fixed:** margin gate, tier by resulting notional, `now` required, step/min/max, market status, divergence guard, timestamps fail-closed.
- **Open:** UI does not yet render `unhedgeable[]`; unknown USD is 0 for partial chains; AC1 recorded fixture; fee assumption.
- **Evidence:** `pnpm typecheck`/`test`; live `/v2/markets` + `/price/v2/*` reads.

## Entry 011 - Frontend review

- **Date:** 2026-10-22
- **Scope:** 001-exposure-to-hedge-preview UI
- **Reviewer:** frontend-reviewer -- **PASS_WITH_NOTES**
- **Passed:** simulation honesty, live provenance, blocked states, responsive tables (360/768), text contrast AA.
- **Open MEDIUM:** render `unhedgeable[]`; explicit timezone; units/signs; fee/funding/headroom visibility; table captions/row headers; input border contrast 1.24:1; no axe/Lighthouse report.
- **Evidence:** `docs/evidence/slice-001-e2e.png`; `pnpm typecheck`/`test`/build.
## Entry 012 - QA re-run + AC1 fixture closure

- **Date:** 2026-10-23
- **Scope:** 001-exposure-to-hedge-preview
- **Reviewer:** qa-validator -- **PASS_WITH_NOTES**
- **Evidence:** `pnpm typecheck` exit 0; `pnpm test` 11 files / 32 tests; `next build` success; `pnpm test:e2e` PASS; live API 200 with 2 positions / 1 proposed preview; SQLite 2 positions + 1 decision per run.
- **AC1 closed:** `tests/fixtures/uniswap-v3-1387878.json` (block 26252256) with Uniswap SDK expected amounts; `packages/core/test/uniswapV3.fixture.test.ts` matches within 1e-6.
- **Fixed since prior QA FAIL:** Cardano blockReference, literal preview banner + position timestamps, SQLite persistence + risk_decisions, E2E, failure tests (empty book, zero margin, determinism, size/tier/partial), docs drift.
- **Open MEDIUM (tracked):** a11y axe/Lighthouse report, malformed-price guard/test, more failure injection, lint stub, unhedgeable UI panel, fee/headroom display, timezone/captions.
- **Decision:** all five reviewers PASS_WITH_NOTES; scope is ready for human acceptance. Not signed off until the human approves.
- **Human approval:** pending
## Entry 013 - Human approval + orchestrator sign-off

- **Date:** 2026-10-23
- **Scope:** 001-exposure-to-hedge-preview
- **Reviewers:** contracts (008), security (009), strike (010), frontend (011), QA (012) -- all PASS_WITH_NOTES
- **Human approval:** **approved** by owner ("Approve lah")
- **Decision:** **SIGNED OFF WITH NOTES** for the preview-only scope.
- **Closed:** AC1 recorded-block fixture; persistence + `risk_decisions`; E2E; AC3/AC9; simulation boundary.
- **Accepted MEDIUM follow-ups:** axe/Lighthouse report, malformed-price guard, `unhedgeable[]` UI panel, ESLint stub, fee assumption, additional failure-injection tests.
- **Policy:** mainnet read-only; no orders; no API wallet headers; Indonesia restricted.
- **Next:** scope 002 (Hedge Studio + simulated execution lifecycle).
## Entry 014 - Scope 002 implementation (ready for review)

- **Date:** 2026-10-23
- **Scope:** 002-hedge-studio-simulated-execution
- **Status:** implemented - ready for independent review; **not signed off**
- **Reviewers:** none yet for scope 002
- **Execution mode:** simulate / read-only
- **Evidence:** `docs/scopes/002-evidence.md`; `docs/evidence/slice-002-e2e.png`
- **Tests:** `pnpm test` 12 files / 36 tests; `pnpm typecheck` exit 0; `next build` success; `pnpm test:e2e` PASS.
- **Live API flow (temp DB):** create 201 -> activate 200 -> simulate 200 FILLED -> duplicate `idempotent:true`; DB 1 strategy, 1 mandate, 1 intent, 1 simulated order, 1 simulated fill, 10 audit events.
- **No order path:** guard tests pass; `simulated:true` in API/fill; no `/v2/order`/API-wallet headers.
- **Open:** AC2 inactive-mandate API test; route unit tests; partial-fill path; fee assumption; wallet connectors.
- **Next:** contracts/security/strike/frontend/QA review, then human approval.
## Entry 015 - Scope 002 contracts re-review + fixes

- **Date:** 2026-10-23
- **Scope:** 002-hedge-studio-simulated-execution
- **Reviewer:** contracts-reviewer -- **PASS_WITH_NOTES** (cycle 2)
- **Fixes after cycle 1 FAIL:** existing-hedge summation (no duplicate full fills), exposure provenance required and stale-blocking, timeout/partial outcomes, blocked/replayed audits, fills read path, `executionMode` on routes, activity 404, expired activation audit, transaction wrapping, table-name/scope amendment.
- **Open MEDIUM:** partial-fill fee/funding scaling (fixed after review), route-level mandate/idempotency tests, reconciliation route (AC6 partial), UI residual/coverage from Decimal (fixed after review), schema version/provenance, tiebreaker ordering.
- **Tests:** 12 files / **38 tests**; typecheck/build pass; E2E create -> activate -> simulate -> FILLED -> reload.
- **Decision:** contracts gate PASS_WITH_NOTES; security/strike/frontend/QA still required.
## Entry 016 - Scope 002 review: contracts/security/QA

- **Date:** 2026-10-23
- **Scope:** 002-hedge-studio-simulated-execution
- **Reviewers:** contracts **PASS_WITH_NOTES** (entry 015), security **PASS_WITH_NOTES**, QA **PASS_WITH_NOTES**
- **Tests:** 12 files / **38 tests**; typecheck/build/E2E pass; audit clean.
- **Verified live:** create 201 -> activate 200 -> simulate 200 FILLED (8 ETH @ VWAP, simulated); second key -> REJECTED WITHIN_TOLERANCE, one fill; same key -> idempotent; stale exposure -> POSITION_NOT_FRESH; inactive/expired mandate -> 400 + audit; concurrency probe no double fill.
- **Open MEDIUM:** route-level duplicate/inactive-mandate tests, client-supplied exposure provenance, AC6 reconcile route deferred, AC8 margin-utilization UI, partial-fill VWAP/fee, symbol-only asset identity, unauth local-demo routes, lint stub.
- **Pending:** strike reviewer, frontend reviewer, human approval.
- **Decision:** no BLOCKER/HIGH; scope 002 is ready for human acceptance with notes. Not signed off.
## Entry 017 - Scope 002 A hardening pass

- **Date:** 2026-10-23
- **Scope:** 002-hedge-studio-simulated-execution (A items only)
- **Status:** implemented; scope 002 still not signed off
- **Changes:** route-level API tests for inactive/expired mandate and idempotent replay; `EXECUTION_MODE` constant; configurable `STRIKEEL_TAKER_FEE_BPS`; `marginHeadroomUsd` rename; activity reason/payload rendering; `schemaVersion: 1`; per-strategy execution lock; loopback guard; in-process rate limits; 10s market-config cache; fill `marketSource`/`marketObservedAt`/`adapterVersion`/`marginUtilizationPct`; UI shows margin utilization and fill provenance; ESLint 9 config replaces the stub; README/env/evidence updated.
- **Tests:** `pnpm test` **14 files / 43 tests**; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass; `pnpm test:e2e` PASS (create -> activate -> simulate -> FILLED -> reload).
- **Deferred (B):** server-side preview snapshot provenance, canonical asset identity, full mandate schema, reconcile route, real auth/ownership.
- **Next:** re-run build/E2E, then strike/frontend/human approval.

