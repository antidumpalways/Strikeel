# Validation Protocol

- **Status:** Active for Phase 2; used for Phase 1 docs review where applicable
- **Version:** 0.1
- **Date:** 2026-10-20

## 1. Purpose

Prevent unverified work from being signed off. Every scope ends with an evidence-backed verdict from at least two independent reviewers. The builder never approves its own work, and the orchestrator never writes product code.

## 2. Roles

| Role | Owns | Cannot |
|---|---|---|
| **Orchestrator** | Scope, sequencing, final sign-off, validation log | Write product code, approve own scope decisions alone |
| **Builder** | Implementation within an approved scope | Review or approve its own changes |
| **Contracts Reviewer** | API/types, state machine, schema, cross-package contracts, docs-code consistency | Approve security or domain correctness alone |
| **Security Auditor** | Secrets, authz, signing, restricted-mode enforcement, injection, dependency risk | Rewrite the implementation during review |
| **Frontend Reviewer** | UI correctness, accessibility, honest labeling, state handling | Approve backend/risk math |
| **Strike Reviewer** | Strike API semantics, sign conventions, margin/funding math, endpoint usage, simulation boundaries | Approve unrelated UI or infra |
| **QA Validator** | Test adequacy, reproducibility, acceptance-criteria evidence, failure paths | Be the sole reviewer of code it wrote or heavily edited |
| **Arbiter** | Resolve reviewer deadlock and disputed severity; final technical verdict | Override a human decision or a BLOCKER without evidence |

## 3. Review sequence

```text
Builder handoff
  → Contracts Reviewer
  → Security Auditor
  → Frontend Reviewer (if UI changed)
  → Strike Reviewer (if Strike/risk integration changed)
  → QA Validator
  → Arbiter (only on deadlock, disputed severity, or unresolved HIGH)
  → Orchestrator sign-off
  → Human approval (scope end)
```

Parallel review is allowed only for independent domains (e.g., frontend and Strike review). Contracts and security must complete before QA sign-off.

## 4. Independence and the two-reviewer rule

- A reviewer must not have authored or materially edited the files under review.
- Each reviewer runs in a fresh context and receives the handoff contract, not the builder's private reasoning.
- At least **two independent reviewers** must return `PASS` before sign-off.
- At least one of the two must be **Contracts** or **Security**.
- If UI changed, **Frontend** must be one of the two.
- If Strike integration or risk math changed, **Strike Reviewer** must be one of the two.
- QA is mandatory but cannot be the only reviewer.
- No self-approval, no reciprocal approval between two agents that edited the same file.

## 5. Severity

| Severity | Meaning | Effect |
|---|---|---|
| **BLOCKER** | Data loss, unauthorized trade, secret exposure, policy violation, false evidence | Immediate stop; no sign-off |
| **HIGH** | Wrong financial result, missing mandate check, silent stale data, misleading demo | FAIL until fixed and re-reviewed |
| **MEDIUM** | Robustness gap, missing test, confusing UX, non-critical inconsistency | PASS_WITH_NOTES allowed only with a tracked follow-up and human acceptance |
| **LOW** | Style, naming, minor docs | Notes only |

BLOCKER/HIGH always block. A reviewer may not downgrade a BLOCKER without the arbiter and human approval.

## 6. Verdict format

Every reviewer returns exactly this structure:

```text
VERDICT: PASS | PASS_WITH_NOTES | FAIL
SCOPE: <scope id and title>
REVIEWER: <role>
INDEPENDENCE: <"no edits to these files" | explanation>
FINDINGS:
- [BLOCKER|HIGH|MEDIUM|LOW] <file:line or doc section> — <issue> — <required fix>
EVIDENCE CHECKED:
- <command/output path | test name | endpoint log | screenshot>
OPEN QUESTIONS:
- <question or "none">
NOTES:
- <optional>
```

Rules:

- `FAIL` requires at least one BLOCKER or HIGH.
- `PASS` with any open HIGH/BLOCKER is invalid.
- Evidence must be a path, command, or URL that another reviewer can reproduce.
- "Looks good" without evidence is not a verdict.

## 7. Cycles and escalation

- Maximum **3 review cycles per scope**.
- Cycle 1: full review. Cycle 2: re-review only failed findings plus regression check. Cycle 3: final attempt.
- After cycle 3 without two PASS verdicts, stop and escalate to the human with:
  - open findings,
  - attempted fixes,
  - root cause,
  - recommended options (reduce scope, change design, accept risk with disclosure).
- Do not loop indefinitely; do not weaken acceptance criteria to force a PASS.

## 8. Disagreement

1. Reviewer and builder record their positions with evidence.
2. Arbiter reviews both, selects a verdict, and records rationale.
3. If the arbiter disagrees with a security BLOCKER, the human decides.
4. The final decision is appended to `docs/agents/validation-log.md`.

## 9. Sign-off

The orchestrator signs off only when:

- two independent `PASS` verdicts exist (or `PASS_WITH_NOTES` accepted by the human);
- no open BLOCKER/HIGH;
- quality gates PASS (`docs/agents/quality-gates.md`);
- the validation log entry is complete;
- the human has approved the scope.

Sign-off means "verified within the stated scope", not "production ready".

## 10. Evidence standard

Acceptable evidence:

- test output with command, date, and pass/fail counts;
- file paths and line references in the repo;
- recorded HTTP request/response (redacted, no secrets);
- transaction hash or block/slot reference for on-chain claims;
- screenshots or video with a caption stating simulated vs live;
- commit hash or diff when a repo exists.

Unacceptable: memory, "I ran it earlier", screenshots without context, mock data presented as live, or claims that cannot be reproduced.
