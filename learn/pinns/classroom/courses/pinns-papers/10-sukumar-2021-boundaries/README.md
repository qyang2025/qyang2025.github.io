# Paper10 — Smooth distance factors and exact Dirichlet values

Primary: Sukumar and Srivastava, https://arxiv.org/abs/2104.08426 (2021 preprint), sections2 and5, equations7 and21.

Independent unit-disk teaching adaptation: -Delta u=4, rim g=0.2x, smooth circular factor phi=(1-x*x-y*y)/2. Four controls, three paired parameter initialisations,337-parameter tanh,2000 Adam updates. All final models retained. We do not implement general R-function geometry assembly, mixed boundary types, biharmonic or4D benchmarks.

Run `python -m pip install -r requirements.txt`, then `python disk_boundary_cpu.py`. For exploratory settings use `--output a-new-file.json`; nonbaseline settings cannot overwrite trace.json. Runtime was about13–27seconds per run here; other CPUs differ. No GPU needed.

Soft controls use g+N, with boundary weight1 or100. Smooth hard control uses g+phi*N; raw distance control uses g+(1-sqrt(x*x+y*y))*N. The latter is deliberately unsuitable for classical second derivatives at the centre. No hidden smoothing or radius clamping is used. The centre audit stores a null residual and false finite flag. JSON contains no NaN.

128 Fibonacci interior points exclude centre,64 training rim points. Independent257 shifted rim and257 rotated residual points; full31x31 masked disk field includes centre.301-point y=0 diameter is for display only. Paired weights differ in their initial functions due to the ansatz. Timing includes checkpoint work, and no universal accuracy or speedup claim follows.

Hard rim errors reach floating-point round-off while full-disk errors differ; exact boundary values do not mean exact interior solutions. All three seeds, including failed distance derivatives, are in trace.json. The guide contains full bilingual narration, protocol and results. Reference fields never enter the training loss.
