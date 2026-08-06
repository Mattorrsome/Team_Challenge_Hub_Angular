---
name: compress-spec-plan
description: Compress an iteratively-revised spec (in .docs/specs/) or plan (in .docs/superpowers/plans/) into a clean, internally-consistent current-state document, moving superseded decisions and rejected alternatives into an append-only decision log. Use this whenever a spec or plan shows signs of revision drift — contradictory requirements, "actually, scratch that" / "on second thought" language, duplicate or stale sections — or before starting implementation, before handing the doc to a fresh context, or whenever the user asks to "compress," "clean up," "consolidate," or "tidy" a spec or plan. Also trigger proactively if you notice a spec/plan you're reading has this kind of drift, even if the user didn't ask.
---

# Compress Spec/Plan

## When to use this

Trigger on:
- Explicit request: "compress this spec," "clean up the plan," "consolidate the auth spec"
- End of a planning/discussion phase, before implementation begins
- Before handing a spec/plan to a fresh agent context or new contributor
- Noticing drift while reading a spec/plan for another task — contradictory requirements, reversed decisions still visible, stale TODOs that are actually resolved

Do NOT trigger for routine single edits to a spec/plan — this is a checkpoint operation, not a normal write. If asked to just "update the spec" with one new requirement, do that directly instead.

## Inputs

- Spec file(s) in `.docs/specs/` — e.g. `.docs/specs/<feature>.md`
- Plan file(s) in `.docs/superpowers/plans/` — e.g. `.docs/superpowers/plans/<feature>-plan.md`
- Task list, if present, alongside the plan
- Decision log, if present — create one if missing (ask the user, or default to `.docs/superpowers/plans/<feature>-decisions.md` scoped per-feature, matching how the plan itself is scoped)

## Process

1. **Read the full document end to end before changing anything.** A decision later in the doc may override something stated earlier — don't compress section by section in isolation.

2. **Identify current ground truth for every requirement, constraint, and decision.** Where the document contradicts itself across revisions, the most recent explicit statement wins, unless a later note clearly reverts to an earlier one.

3. **Extract everything superseded, rejected, or resolved-away.** For each, append one entry to the decision log:
   ```
   [DATE or iteration marker] Rejected: <what was considered>
   Reason: <why, one sentence>
   Superseded by: <what's in the compressed doc now>
   ```
   The decision log is append-only — never overwrite or reorder existing entries.

4. **Rewrite as if written once, correctly, from full knowledge.** No visible seams ("originally we thought X, but..."). State only the current requirement/decision/step.

5. **Preserve open questions as open questions.** Keep a clearly marked "Open Questions" section for anything genuinely unresolved — don't silently resolve ambiguity just to tidy the doc.

6. **Keep load-bearing rationale inline, briefly**, when a future reader would otherwise "helpfully" revert a non-obvious decision (e.g. "polling, not webhooks — client can't expose a public endpoint"). Purely historical rationale goes to the decision log instead.

7. **Diff-check before finalizing.** Every requirement/constraint/edge case in the original must appear either in the compressed doc or explicitly in the decision log as rejected. Nothing vanishes unaccounted for.

8. **Report what changed.** Before finalizing, list: what was removed/merged/resolved and why, plus anything you were unsure about — flag rather than guess.

## Output

- Overwrite the spec file in `.docs/specs/` and/or plan file in `.docs/superpowers/plans/` with the compressed version.
- Append new entries to the decision log (never rewrite existing ones).
- Print the change summary in the response, not just in files.

## Guardrails

- Never delete or truncate the decision log.
- If a requirement's origin/rationale is unclear even after reading full history, flag it rather than silently dropping it.
- If spec and plan disagree after compression, resolve explicitly or flag — don't let compression paper over it.
- Compression should shrink length/redundancy, not coverage. Fewer requirements post-compression without a matching rejection entry is a bug — recheck.
