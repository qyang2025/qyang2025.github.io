# qyang2025.github.io

Personal academic homepage of **Qianhong Yang** — https://qyang2025.github.io

Plain static HTML/CSS (no build step), deployed by GitHub Pages via `.github/workflows/static.yml`.

```
index.html          single-page homepage (about, news, research, publications, CV sections)
gallery.html        simulation movies + photos
assets/css/main.css styles (light/dark themes)
assets/js/main.js   theme toggle, BibTeX toggles, sidebar section highlight
assets/img/         web-optimized images (profile, research figures, video posters)
videos/             simulation movies (Movie S*.mp4)
about.html, research.html, publications.html, videos.html, activity.html
                    redirect stubs so old links keep working
```

To add a news item or paper, edit the `#news` / `#publications` sections in `index.html`.

## Professor Vee learning series

The homepage Teaching section and sidebar link to `learn/`. The first topic is the
PINNs series at `learn/pinns/`; its six-chapter static classroom is at
`learn/pinns/classroom/`. No Node server is required on GitHub Pages.

Published features: 3D Professor Vee, authored progressive reveals, physical
animations, linked schematic/formula highlights, laser pointer, prepared British
English Kokoro narration (453 sentence clips), bilingual slides/transcripts,
step-by-step reading, teaching guide and downloadable Python experiments.
Chinese recordings are not yet cached for this course, so Chinese is explicitly
reading mode. Narration starts only after a click and stops on page hiding;
Web Locks coordinate a single audible classroom per origin.

Live questions, Codex-generated supplementary slides, model inference and new
voice generation stay in the local application. No credentials, browser profiles,
model weights, job records or local API server are included in this static export.

To preview: `python -m http.server 4320 --bind 127.0.0.1` from the repository root,
then open `http://127.0.0.1:4320/learn/`.

To update PINNs from the local teaching app:
```
node C:/Users/YangQianhong/virtual-professor/scripts/export-website.mjs <this-repository>
node C:/Users/YangQianhong/virtual-professor/scripts/check-website.mjs <this-repository>
```
The exporter uses the app's existing soundfile installation to compress selected
cached narration into Ogg Vorbis. It refuses an incomplete English course rather
than publishing broken narration. The exported learning section is about 26.7 MB.

To add a future topic: publish its own overview/classroom under `learn/<topic>/`
and append an entry to `learn/series.json`. `learn/series.mjs` renders the catalogue;
the PINNs card remains a fallback if JavaScript is unavailable. Each topic is a
separate series; chapters are the lessons inside that series.

Validation: all English narration sentences matched the authored text; local
course links/imports resolved; browser checks covered homepage navigation,
classroom loading, English/Chinese switching, progressive equation/physical
schematic reveals and the Python-demo page. No narration was started during the
website integration check. The static.yml workflow deploys this site to GitHub Pages after a push to main.


## Paper-by-paper PINNs (Paper 01)

The PINNs landing page now organises one paper per presentation. The first
implemented paper is Raissi, Perdikaris & Karniadakis (2017), Part I, section 2.1.
Open learn/pinns/classroom/?paper=raissi2017&language=en. Its 21 bilingual slides
and 122 prepared English clips share the existing professor and classroom assets.
The six-chapter general primer keeps its existing URL as optional preparation.
Chinese is explicitly reading mode until its narration is prepared.

Paper 01 includes physical Burgers evolution, residual/condition schematics,
LaTeX equations, derivative code and actual CPU-training replay. Final-error
narration starts only after the replay reaches its final checkpoint. The saved
experiment uses 1297 parameters, 384 collocation points, four CPU threads and
seed 11. The time window is shortened to [0,0.2]; this is a small method
implementation, not a full benchmark reproduction. Measured PINN runtime 14.3 s,
held-out relative error 2.07%; data-only control 2.8 s and 31.15%. Single seed,
unequal derivative cost, no universal performance claim. Code, complete traces,
reference checks and a standalone mathematical guide are downloadable.

learn/pinns/roadmap.json records the paper progression and CPU budget. Papers
02–05 are clearly planned, not completed. Future courses should implement one
named paper, state each adaptation and include independently checked results.
The browser replays traces; it never launches training or accesses local Codex.

Validation: 110 tests pass in the authoring project. Static checks match all 575
English clips to the primer and paper scripts. Browser checks covered physical
reveal, joint equation/diagram presentation, actual-result replay, final-number
alignment, language switching with paper selection preserved, and the old primer
link. This new-paper check remained silent and paused.
