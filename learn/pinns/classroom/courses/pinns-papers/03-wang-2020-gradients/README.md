# Paper 03: gradient pathologies and balancing

Independent teaching adaptation of Wang, Teng & Perdikaris (2020), sections 2.3 and 2.5. https://arxiv.org/abs/2001.04536

Install `python -m pip install -r requirements.txt`, then run `python poisson_gradients_cpu.py`. The default executes twelve small CPU runs. Python 3.12, float64, four threads; 1273 parameters; 64 fixed interior midpoint points, two endpoints, 4000 Adam updates per run, 90-second cap per run. Same initialisation and training points are paired by seed across four policies. No interior solution labels or validation-based checkpoint selection.

The analytic solution is sin(4x), x in [0,1]; source -16 sin(4x), boundaries 0 and sin(4). Independent field validation uses 201 grid points; held-out residual uses 128 shifted points. The animated string depicts a load ramp between static equilibrium solutions with fixed endpoints, not transient integration.

The original paper's larger 2-D benchmarks, network and arithmetic differ. Its gated architecture and Hessian analysis are NOT implemented here. The ratio rule uses max absolute residual gradient divided by mean absolute unweighted boundary gradient, following the displayed Algorithm 1. Statistics include all trainable scalars; unused residual coordinates are zero. Controller values are detached, updated every ten steps and held between checks.

Four policies:
- Unit weight 1.
- Fixed weight 100, a stated control rather than an optimally tuned constant.
- Ratio controller: alpha 0.9, denominator floor 1e-12, proposal bounds [1e-6,1e6]. These numerical safeguards are departures from the unbounded displayed rule.
- Guarded engineering modification: alpha 0.1, bounds [1,100], same denominator floor.

The ratio policy FAILS badly on this adaptation while the unit baseline fits well. Guarded proposals clip at every update for all seeds, so the good guarded result is not evidence that a freely adaptive controller discovered an optimal weight. All runs and clipping counts are retained. Three seeds do not establish a universal ranking, and timings have different diagnostic overhead.

| Policy | Seed | Training seconds | Field error (%) | Clipped proposals |
|---|---:|---:|---:|---:|
| unweighted | 11 | 7.7 | 0.0319 | 0 |
| fixed100 | 11 | 7.1 | 0.0043 | 0 |
| adaptive | 11 | 7.3 | 85.1619 | 133 |
| unweighted | 22 | 7.0 | 0.0174 | 0 |
| fixed100 | 22 | 7.7 | 0.3740 | 0 |
| adaptive | 22 | 7.9 | 82.8471 | 132 |
| unweighted | 33 | 7.7 | 0.0355 | 0 |
| fixed100 | 33 | 8.5 | 0.0069 | 0 |
| adaptive | 33 | 10.5 | 75.0354 | 120 |
| guarded | 11 | 17.1 | 0.0089 | 400 |
| guarded | 22 | 16.9 | 0.0059 | 400 |
| guarded | 33 | 17.0 | 0.0121 | 400 |

Exercise: `python poisson_gradients_cpu.py --frequency 6 --output trace-C6.json`. Compare independent errors and weight behaviour before making claims about improvement. Avoid overwriting published results. `--modes` allows a stated subset; `--append` adds runs only when source frequency and step count match the existing record. Full defaults reproduce every mode.
