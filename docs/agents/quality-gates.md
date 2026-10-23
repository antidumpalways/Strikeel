# Quality Gates

- **Status:** Active
- **Version:** 0.1
- **Date:** 2026-10-20
- **Related:** `docs/agents/validation-protocol.md`

A gate is PASS only when its criteria are met and the evidence is linked. A missing command or missing evidence is a FAIL, not a note. Gates are recorded in `docs/agents/validation-log.md`.

## 1. Gate definitions

### G0 — Scope and docs

**Pass when**

- an approved scope exists with numbered acceptance criteria and an explicit out-of-scope list;
- changed behavior is reflected in the relevant docs (`docs/architecture`, `docs/scopes`, ADRs);
- no undocumented dependency or external service was added.

**Evidence:** scope path, doc diff, dependency diff.

### G1 — Build and types

**Pass when**

- dependencies install reproducibly;
- production build succeeds;
- TypeScript strict typecheck passes with no `any` escapes added without justification;
- lint passes.

**Commands (expected after scaffold):**

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
```

**Evidence:** command output, exit code 0.

### G2 — Tests

**Pass when**

- the scope's required tests exist;
- unit, integration, and E2E suites relevant to the change pass;
- no critical test is skipped or `.only`;
- financial math tests include boundary and out-of-range cases;
- failure-path tests exist for stale data, missing market, and insufficient margin.

**Commands:**

```bash
pnpm test
pnpm test:e2e        # when UI/flow changed
```

**Evidence:** test output with counts; list of new/updated test files.

### G3 — Security and secrets

**Pass when**

- no secret, private key, API key, seed phrase, or token is committed;
- no secret reaches the client bundle;
- authenticated routes check ownership on every record;
- input is validated at the boundary;
- restricted-mode enforcement cannot be bypassed by a UI toggle;
- dependencies are audited;
- logs redact sensitive values.

**Commands (expected):**

```bash
pnpm audit
git grep -nE "(PRIVATE_KEY|SECRET|MNEMONIC|API_KEY|Bearer )" -- ':!*.md'   # when git exists
```

**Evidence:** audit output, secret scan, reviewer sign-off, threat notes for changed surfaces.

### G4 — Accessibility and UX honesty

**Pass when (UI changes)**

- interactive elements are keyboard reachable and labeled;
- color is not the only carrier of meaning;
- focus states are visible;
- text contrast meets WCAG AA for body text;
- loading, empty, stale, blocked, and error states exist;
- simulation/preview labels are visible and unambiguous;
- no copy implies guaranteed protection, profit, or live execution.

**Evidence:** screenshots of states, a11y check (axe/Lighthouse or manual checklist), frontend verdict.

### G5 — Originality

**Pass when**

- code, UI, copy, and assets are original or properly licensed;
- no copied repository code without license compatibility and attribution;
- no scraped private data or impersonation of Strike branding;
- third-party dependencies are listed with licenses where required.

**Evidence:** source list, license notes, reviewer verdict, diff review.

### G6 — Evidence

**Pass when**

- every acceptance criterion maps to evidence;
- every numeric claim is reproducible from a fixture, command, or recorded response;
- screenshots/logs state whether data is live, recorded, or simulated;
- validation log entry is complete.

**Evidence:** AC → evidence table, commands, logs, screenshots.

### G7 — Strike domain and simulation boundary

**Pass when**

- endpoints, symbols, and parameter names match official Strike docs;
- sign conventions, decimals, mark/index, funding, and margin formulas are correct;
- pending is never treated as filled;
- market existence and status are resolved, not assumed;
- `EXECUTION_MODE=simulate` performs no order submission;
- a test proves `POST /v2/order` is unreachable in simulate mode;
- UI/API/audit labels distinguish simulated from live.

**Evidence:** Strike reviewer verdict, request log, test name/output, endpoint references.

### G8 — Data integrity

**Pass when**

- money uses decimal strings or integer minor units; no float arithmetic;
- asset identity uses chain + contract/policy + decimals, not symbols alone;
- every position and price carries source, timestamp, and block/slot where applicable;
- stale snapshots cannot overwrite newer ones;
- derived values are reproducible from stored inputs.

**Evidence:** schema review, unit/property tests, sample snapshot.

## 2. Gate matrix

| Change type | Required gates |
|---|---|
| Docs only | G0, G5, G6 |
| Pure domain / risk math | G0, G1, G2, G5, G6, G8 |
| Chain or Strike adapter | G0, G1, G2, G3, G6, G7, G8 |
| UI | G0, G1, G2, G4, G6 |
| Execution / mandate logic | G0–G3, G6–G8 + human approval |
| Demo / submission package | All gates + human approval |

## 3. Failure handling

- Any gate FAIL blocks sign-off.
- A gate cannot be waived by the builder; only the human can accept a documented risk, and only for MEDIUM findings.
- Security and policy findings are never waived.
- Re-run affected gates after every fix; do not assume a previous PASS still holds.

## 4. Reporting

Each gate report uses:

```text
GATE: G<N> — <name>
RESULT: PASS | FAIL
COMMAND/EVIDENCE: <path or command>
NOTES: <optional>
```

The QA validator compiles gate results into the validation log. The orchestrator checks the compiled report before sign-off.
