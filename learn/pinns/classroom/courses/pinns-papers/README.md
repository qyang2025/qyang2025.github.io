# PINNs paper implementation series

Every new presentation teaches exactly one named paper and includes a runnable,
small implementation. Preserve the six-chapter general primer as preparation;
do not describe those chapters as six paper implementations.

Teaching sequence: recall the previous limitation, show a physical animation,
introduce variables at first use, explain equations through the same schematic,
connect the derivatives and loss to code, replay an executed experiment, compare
with a controlled baseline, independently validate, state limits, and explain why
the next paper is needed. Keep one question per page; add sparse pages instead of
shrinking type. Use LaTeX mathematics and readable LaTeX-style diagram labels.
Keep existing professor expression, small-body modelling, 120-degree maximum pen
arm, obstacle-first laser routing and actual-audio-driven animation rules.

Default local experiment target: CPU, four threads, <5000 parameters, <=1024
collocation points, 90 seconds of training per run. Startup and verification add
overhead. Prefer analytic or quadrature references over large reference solvers.
When a paper benchmark is beyond budget, clearly identify the smaller method
adaptation and never transfer its reported accuracy to the teaching experiment.
Report actual seeds, runtime, errors, all simplifications and control costs.
One successful seed is not a statistical comparison. Browser pages only replay
saved recordings and numeric traces; they never launch training automatically.

Paper 01: Raissi et al. (2017), Part I, section 2.1 (Burgers continuous-time model).
- `burgers_cpu.py`: independent PyTorch CPU implementation and reference checks.
- `trace.json`: actual recorded fields, training curves, metrics and configuration.
- `1.json`: 21 authored bilingual slides, speaker notes, expressions and cues.
- `guide.html`: full script, implementation scope, validation and references.
- `paper-01.zip`: reproducible material archive, no models or credentials.

Authoring/build: scripts/build-pinns-paper-01.mjs.
Narration cache: scripts/prewarm-pinns-paper-01.mjs (English George).
Website export: scripts/export-website.mjs <site-root>.
Register implemented papers in catalog.json. Only mark a paper published when its
course data, code, recorded experiment and narration are ready. Website roadmap
entries beyond Paper 01 are planned readings, not finished presentations.

Authored paper decks may request a larger explicit maxSlides in validateLesson;
ordinary generated lesson validation retains its 13-slide default. The authored
lesson.sectionStarts array defines its own teaching route. Custom paper widgets
have validated visible-node counts and use actual audio time as their clock.
