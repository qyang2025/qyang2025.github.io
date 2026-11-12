# DeepONet: small supervised operator experiment

Primary source: https://arxiv.org/abs/1910.03193

Run `python -m pip install -r requirements.txt`, `python operator_cpu.py`, then `python verify_experiment.py`. One CPU thread; nine runs, three architectures and three starts. Each run uses 2400 Adam updates with a 90-second cap. Saved trace includes all final states, held-out fields, PDE residuals and extrapolation checks.

This teaching adaptation uses a finite three-sine Poisson family, fixed nine sensors and exact endpoint wrapping. It is not a reproduction of the original large benchmarks. The linear-branch control encodes a problem-specific prior. Different architectures have different capacities and do not share initial functions. See the teacher guide for all outcomes and interpretation limits.
