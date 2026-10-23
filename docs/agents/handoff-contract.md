# Handoff Contract

- **Status:** Active
- **Version:** 0.1
- **Date:** 2026-10-20
- **Related:** `docs/agents/validation-protocol.md`, `docs/agents/quality-gates.md`

Every builder-to-reviewer handoff uses this contract. A handoff without evidence is rejected before review starts. The builder does not declare completion; it declares **ready for review**.

## 1. Required fields

| Field | Required | Content |
|---|---|---|
| `scope` | Yes | Scope ID and title, linked to `docs/scopes/…` |
| `status` | Yes | `ready-for-review` \| `blocked` \| `changes-requested` |
| `summary` | Yes | What changed and why, max 5 bullets |
| `acceptance` | Yes | AC ID → status (`met`, `partial`, `not-started`) with evidence pointer |
| `files` | Yes | Created/modified/deleted paths; note generated files |
| `commands` | Yes | Exact commands run, working directory, exit codes |
| `evidence` | Yes | Test output paths, screenshots, endpoint logs, fixture hashes |
| `risks` | Yes | Known limitations, unresolved findings, data-quality caveats |
| `next_question` | Yes | The single decision the reviewer/orchestrator must make next |
| `execution_mode` | If relevant | `simulate` or `read-only`; never `live` without ADR approval |
| `secrets` | Yes | `none` or how references (not values) are managed |
| `commit` | If repo exists | Commit hash or diff reference |

## 2. Template

```markdown
## Handoff — <scope id>

- **Status:** ready-for-review
- **Execution mode:** simulate
- **Commit/diff:** <hash or path>

### Summary
- <change>
- <change>

### Acceptance criteria
| AC | Status | Evidence |
|---|---|---|
| AC1 | met | `evidence/unit.log`, test `lpAmounts.spec.ts` |
| AC2 | partial | `evidence/e2e.png`; missing stale-state case |

### Files
- `packages/core/src/exposure.ts` (new)
- `apps/web/app/hedge/page.tsx` (modified)
- `db/migrations/0002_positions.sql` (new)

### Commands
```bash
pnpm typecheck   # exit 0
pnpm test        # 42 passed, 0 failed
pnpm build       # exit 0
```

### Evidence
- `evidence/unit.log`
- `evidence/strike-depth.json` (recorded 2026-10-21T…, redacted)
- `evidence/hedge-preview.png`
- Fixture: `fixtures/eth-usdc-uni-v3-block-…json` (sha256 …)

### Risks
- RPC fixture assumes finality at block …; live path not tested.
- Slippage estimate excludes queue position.

### Open findings
- None / [HIGH] … (must be resolved before sign-off)

### Secrets
none

### Next question
Approve the VWAP approach for size-aware price, or require limit-price preview only?
```

## 3. Rules

1. **No completion claims.** Use `ready-for-review`, never "done".
2. **Evidence over narrative.** Each AC needs a reproducible pointer.
3. **Commands must be runnable** from the repo root; include exit codes.
4. **No secrets** in logs, screenshots, fixtures, or commit messages.
5. **No fabricated data.** Recorded fixtures must include source URL, timestamp, and redaction notes.
6. **Simulation labels** must be visible in any UI artifact.
7. **Blocked status is valid.** State the blocker and the exact decision needed; do not guess.
8. **Scope discipline.** Out-of-scope changes are listed and reverted or split into a new scope.
9. **Reviewer response** references finding IDs; the next handoff maps each finding to a fix.

## 4. Reviewer acknowledgment

The reviewer starts with:

```text
HANDOFF ACCEPTED | HANDOFF REJECTED
REASON: <missing evidence / out-of-scope / unclear AC>
```

A rejected handoff returns to the builder without a verdict. Only accepted handoffs enter the review cycle.
