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

The homepage Teaching section and sidebar link to [Learning series](learn/). The
[PINNs series](learn/pinns/) contains 20 paper presentations and 473 slides,
plus a separate six-chapter foundation course. Everything published here is
static HTML, JavaScript and cached Ogg audio; GitHub Pages needs no local API.

| Paper | Reference | Slides | English clips | Chinese clips | Classroom |
|---|---|---:|---:|---:|---|
| 01 | Raissi 2017 Part I | 21 | 122/122 | 122/122 | [Open](learn/pinns/classroom/?paper=raissi2017&language=en) |
| 02 | Raissi 2017 Part II | 24 | 141/141 | 141/141 | [Open](learn/pinns/classroom/?paper=raissi2017ii&language=en) |
| 03 | Wang 2020 · Gradients | 24 | 141/141 | 140/140 | [Open](learn/pinns/classroom/?paper=wang2020&language=en) |
| 04 | Krishnapriyan 2021 · Curriculum | 23 | 136/136 | 134/134 | [Open](learn/pinns/classroom/?paper=krishnapriyan2021&language=en) |
| 05 | Wang 2022 · Causality | 24 | 142/142 | 140/140 | [Open](learn/pinns/classroom/?paper=wang2022&language=en) |
| 06 | Yu 2022 · gPINN | 24 | 141/141 | 135/135 | [Open](learn/pinns/classroom/?paper=yu2022&language=en) |
| 07 | Wu 2023 · Sampling | 25 | 148/148 | 144/144 | [Open](learn/pinns/classroom/?paper=wu2023&language=en) |
| 08 | Jagtap 2020 · cPINN | 26 | 156/156 | 151/151 | [Open](learn/pinns/classroom/?paper=jagtap2020&language=en) |
| 09 | Kharazmi 2019 · VPINNs | 25 | 103/103 | 102/102 | [Open](learn/pinns/classroom/?paper=kharazmi2019&language=en) |
| 10 | Sukumar 2021 · exact boundaries | 25 | 102/102 | 102/102 | [Open](learn/pinns/classroom/?paper=sukumar2021&language=en) |
| 11 | Wang 2020 · NTK | 25 | 100/100 | 102/102 | [Open](learn/pinns/classroom/?paper=wang2020ntk&language=en) |
| 12 | Wang2020 · Fourier features | 23 | 95/95 | 95/95 | [Open](learn/pinns/classroom/?paper=wang2020fourier&language=en) |
| 13 | Moseley2021 · FBPINNs | 22 | 98/98 | 96/96 | [Open](learn/pinns/classroom/?paper=moseley2021&language=en) |
| 14 | Yang2020 · B-PINNs | 22 | 94/94 | 87/87 | [Open](learn/pinns/classroom/?paper=yang2020bpinns&language=en) |
| 15 | Raissi2020 · HFM | 22 | 93/93 | 88/88 | [Open](learn/pinns/classroom/?paper=raissi2020hfm&language=en) |
| 16 | Lu2021 · hPINNs inverse design | 23 | 111/111 | 107/107 | [Open](learn/pinns/classroom/?paper=lu2021hpinns&language=en) |
| 17 | Jagtap2020 · XPINNs | 22 | 113/113 | 100/100 | [Open](learn/pinns/classroom/?paper=jagtap2020xpinns&language=en) |
| 18 | McClenny2020 · SA-PINNs | 23 | 115/115 | 105/105 | [Open](learn/pinns/classroom/?paper=mcclenny2020sa&language=en) |
| 19 | Lu2019 · DeepONet | 26 | 118/118 | 111/111 | [Open](learn/pinns/classroom/?paper=lu2019deeponet&language=en) |
| 20 | Wang2021 · Physics-informed DeepONet | 24 | 109/109 | 100/100 | [Open](learn/pinns/classroom/?paper=wang2021pideeponet&language=en) |

Foundation course recordings: English 453/453; Chinese 345/345.
Incomplete recording sets stay in reading mode. A classroom language becomes
playable only when all of that presentation's clips are available.

The professor, captions, progressive equations, schematic highlights, laser and
recorded experiment replays follow the actual sentence audio clock. Physical
introduction diagrams appear from the first sentence. Formula pages reveal in
stages. The Mute control gates sound without disabling the analyser-driven mouth
animation. Playback requires a click, pauses when the page is hidden, and uses
Web Locks to keep one audible classroom per origin. It opens no playback window.

Every paper states its CPU settings, controls, adaptations, validation and limits.
The download contains executable Python, dependencies, saved measurements and a
mathematical teacher guide. The browser replays saved arrays rather than trains
models. Missing-condition ablations and failed runs are retained. Planned lesson
minutes include discussion and exercises, not just uninterrupted recorded speech.

Live questions, local Codex supplements and new voice generation remain in the
local teaching app. This export contains no credentials, browser profiles, model
weights or job records.

Preview with Python's HTTP server from the repository root on port4320. To update
from the separate local teaching-app checkout, pre-generate both narration
languages, package each checked experiment, export with the desired paper cutoff,
and run its update-series-site script. Validate this repository with:

```sh
node scripts/check-pinns-site.mjs
# Require every published Chinese recording as well:
node scripts/check-pinns-site.mjs --require-chinese
```

The Pages workflow runs the first check before uploading. It verifies transcript
identity, coverage metadata, Ogg assets, LaTeX, module/font dependencies, series
links and the absence of popup playback calls. Browser visual and media-clock QA
is separate from this file-integrity check.

New topics belong under learn/<topic>/ with a matching learn/series.json entry;
papers are presentations within a topic, not separate unrelated series.
