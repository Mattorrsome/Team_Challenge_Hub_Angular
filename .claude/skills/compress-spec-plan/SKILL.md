---
name: compress-spec-plan
description: Consolidate ALL spec files in .docs/specs/ into a single new spec file, and ALL plan files in .docs/superpowers/plans/ into a single new plan file — later files override earlier ones where they contradict, unrelated content from all files is merged in, and the original files are deleted afterward. Use whenever the user asks to "compress," "consolidate," "merge," or "clean up" specs or plans, asks to turn multiple spec/plan files into one, or mentions removing/deleting old specs or plans. Also trigger proactively if you notice the specs or plans directory has accumulated many overlapping or contradictory files that would benefit from consolidation, even if not explicitly asked.
---

# Consolidate Specs & Plans

This skill merges multiple spec files (or multiple plan files) into ONE canonical file per domain, then deletes the originals. This is destructive and cross-file — treat it with more care than a single-document cleanup.

## When to use this

Trigger on:
- "Compress all the specs into one," "consolidate the plans," "merge these specs/plans"
- User references removing/deleting old spec or plan files as part of a cleanup
- Noticing many overlapping/contradictory files in `.docs/specs/` or `.docs/superpowers/plans/`

Do NOT trigger for a single-file edit or a request to just tidy one spec/plan — that's a smaller, non-destructive operation (see "Single-file mode" at the end).

## Inputs

- All files in `.docs/specs/` (or a named subset, if the user scopes it to a feature/area)
- All files in `.docs/superpowers/plans/` (or a named subset)
- Decision log — create if missing: `.docs/specs/decisions.md` for specs, `.docs/superpowers/plans/decisions.md` for plans

These are two independent consolidations (specs → one spec file; plans → one plan file). Run them separately even if invoked together — don't cross-merge a spec's content into the plan file or vice versa.

## Step 0 — Establish recency order

Before merging, determine which files are "later" (i.e. take priority on contradiction). Use TWO signals and cross-check them against each other — don't rely on just one:

1. **Filename date, if present.** Many spec/plan files encode a date or sequence in the name (e.g. `2026-03-01-auth-spec.md`, `spec-v3.md`, `plan-2026-06.md`). Extract and parse this as the primary ordering signal when present and unambiguous.
2. **Git commit history.** For every file, get its last-modified commit date: `git log --follow --format=%ai -1 -- <file>`. Use this as a second, independent signal — either to order files that have no date in the filename, or to sanity-check the filename-derived order.
3. **Cross-check the two signals against each other:**
   - If filename date and git last-modified date agree on ordering → confident, proceed.
   - If they disagree (e.g. a file named `spec-v2.md` was actually committed before `spec-v1.md`, or a file's content was edited much later than its filename date suggests) → this is a real signal something is off, not noise to average away. Surface the conflict explicitly and ask the user which should win for that file, rather than silently picking one.
   - If a file has no filename date AND no usable git history (not tracked, or squashed/rebased history that lost per-file dates) → fall back to filesystem mtime as a last resort, and flag it as lower-confidence in your report.
4. **If ordering is still ambiguous after all three signals** (ties, conflicting signals with no clear resolution): stop and ask the user to state the order explicitly. Getting this wrong means the wrong version wins on every contradiction — this is the highest-risk step in the whole process, worth a pause if genuinely ambiguous.

State the order you've determined, and which signal(s) it's based on, before proceeding — so the user can correct it before anything gets merged or deleted.

## Step 1 — Checkpoint before deleting anything

Since originals will be removed:
- If git-tracked: confirm the working tree is clean, or commit/stash outstanding changes first. Do not delete files with uncommitted changes sitting on top of them.
- If NOT git-tracked: explicitly confirm with the user before deleting — there's no safety net otherwise. Consider copying originals to a `.bak/` or similar before removal if they decline to confirm but still want to proceed.

## Step 2 — Read everything before writing anything

Read every file in the target directory, in the recency order from Step 0. Build a mental (or literal, in scratch notes) map of every requirement/decision/step and which file it came from.

## Step 3 — Resolve per-topic, not per-file

For each requirement, constraint, or design decision:
- If only one file addresses it, it carries forward as-is.
- If multiple files address the *same* topic and agree, merge into one clean statement.
- If multiple files address the *same* topic and disagree, the later file (per Step 0 ordering) wins. Log the overridden version to the decision log:
  ```
  [source file — filename date: X, last commit: Y] Superseded: <what the earlier file said>
  Overridden by: [source file — filename date: X, last commit: Y]: <what stands now>
  Reason: <if inferable from context; otherwise "later revision, no stated reason">
  Ordering signal used: <filename date / git history / mtime fallback / user-specified — and note if signals conflicted>
  ```
- Content from earlier files that ISN'T contradicted by anything later still gets merged in — "later wins" applies per-topic, not as "the newest file replaces everything."

## Step 4 — Write the single consolidated file

- Spec consolidation → one new file in `.docs/specs/` (confirm filename with the user if none is obvious, e.g. `spec.md`, or `<project>-spec.md` if the directory is expected to hold more than one going forward for different features — don't assume single-file-forever if the directory structure suggests otherwise)
- Plan consolidation → one new file in `.docs/superpowers/plans/` (same naming consideration)
- Write it as if authored once, from full knowledge — no "file A originally said X but file B says Y" seams.
- Keep a clearly marked "Open Questions" section for anything genuinely unresolved across the source files — don't force resolution just to tidy things.
- Keep load-bearing rationale inline briefly where a future reader would otherwise reverse a non-obvious decision; purely historical rationale goes to the decision log.

## Step 5 — Diff-check before deleting

Every requirement/constraint/step across ALL source files must appear either in the new consolidated file or explicitly in the decision log as superseded. Nothing vanishes unaccounted for. This is the check that catches "we lost a requirement because two files happened to overlap in a way we didn't fully reconcile."

## Step 6 — Delete originals and report

- Delete the individual source files now that the checkpoint (Step 1) exists.
- Report: which files were merged, which topics were overridden and by what, what's in the new decision log, anything flagged as uncertain, and the checkpoint (commit hash, or confirmation) the user can revert to if something looks wrong.

## Single-file mode (non-destructive, no merge)

If the user wants to clean up ONE spec or ONE plan file in place — no cross-file merge, no deletion — that's a lighter operation:
- Read the file, resolve internal contradictions (later section/revision wins), rewrite cleanly in place, log superseded content to the decision log. No Step 0 ordering needed (it's one file), no Step 1 checkpoint requirement (nothing gets deleted), no Step 6 deletion.