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
