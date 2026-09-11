<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# The code is the spec

Glen's build/elevation briefs (`SPC … Brief vN.md`) live in his working folder
and are **gitignored on purpose**. They are historical drafts, not the current
spec, and they are already wrong in at least one place: brief v2 asks for
auto-generated Recommendations, but the Recommendations step was later removed
outright (spec 1.6 — see the comment in
`components/forms/AssessmentWizard/steps/StepReview.tsx`, where the overall
notes moved as a result).

So: **where a brief and the code disagree, the code wins.** If you are handed a
brief, treat it as background on intent, then read the tree to find out what was
actually built. Decisions that supersede a brief get a short comment at the
point of the change, citing the spec number — that trail is the real record.
