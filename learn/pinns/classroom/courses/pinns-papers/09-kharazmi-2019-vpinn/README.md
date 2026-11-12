# Paper09 — VPINNs: test spaces and numerical integration

Primary reference: Kharazmi, Zhang & Karniadakis (2019), https://arxiv.org/abs/1912.00873.
Read sections3,4.2 and5, especially equations4.7,4.20 and4.25.

This is an independent smooth, one-dimensional heated-rod teaching adaptation.
It retains neural trial functions, the Legendre test family and the once-integrated
residual. It changes the source, network size, boundary construction and integration
budget. It does not reproduce shallow sine-network closed forms, original steep
layers, two-dimensional comparisons, hp-VPINNs or a universal performance claim.

## Reproduce the twelve controls

```sh
python -m pip install -r requirements.txt
python poisson_vpinn_cpu.py --output rerun.json
```

The saved environment is Python3.12.10, CPU PyTorch2.15.0 and NumPy2.5.4.
Four CPU threads, float64,321 parameters,2000 Adam updates per run,90-second cap.
All saved runs finish2000 updates in roughly4–7 seconds per run on the author's CPU.
Timing includes shared checkpoint diagnostics; it is not a time-to-accuracy study.
Runs are executed sequentially; no GPU, external PDE solver or downloaded dataset.

The rod obeys -u''=f on(-1,1), zero endpoint temperatures, unit conductivity,
f=2+0.2π²sin(πx). Independent reference u=1-x²+0.2sin(πx), q=-u'.
The source is positive throughout the rod; heat exits both cold ends.
The browser's moving heat markers illustrate steady heat transfer, not a transient.

Every policy uses the same hard-boundary trial u=(1-x²)Nθ. Within each of three seeds
11,22,33,initial weights are identical. Controls: strong residuals at32 fixed
midpoints,weakK1Q32,weakK8Q32 and deliberately underintegrated weakK8Q4.
Tests are v_k=P_(k+1)-P_(k-1), unnormalised. Quadrature is Gauss–Legendre.
The weak loss is mean_k |sum_q ω_q(u'v_k'-fv_k)|², not an integral of residual².

## Interpretation and independent checks

All three strong controls are already accurate here. WeakK1 can have numerically
zero training loss and8.95–33.53% field error. K8Q4 has roughly94% field error;
its positive loss matches an independent discrete least-squares lower bound3.051592843.
At the four Gauss nodes P4=0,so v4'=0 while the discrete source moment is nonzero.
The failure is retained; it is not hidden by choosing a good checkpoint.

Validation:301 analytic field/flux locations,257 shifted strong-residual positions,
Q128 integration with16 test functions,global heat balance and endpoint values.
Once- and twice-integrated residual identities are checked independently.
No validation result selects checkpoints or serves as an interior training label.
Raw strong and weak training losses have different meanings and are not accuracy rankings.

The analytic perturbation w=P3-P1 vanishes at the endpoints and has first weak moment0,
second moment10. The separate x^8 example demonstrates quadrature exactness limits.
These are derived mathematical diagnostics, not additional trained runs.

## Exercise — change tests and quadrature separately

```sh
python poisson_vpinn_cpu.py --test-count 1 --quadrature 64 --seeds 11 --output exercise-k1-q64.json
python poisson_vpinn_cpu.py --test-count 2 --quadrature 64 --seeds 11 --output exercise-k2-q64.json
```

Custom experiments cannot overwrite trace.json. More Q does not remove a finite-test
null space; more K does not guarantee a good quadrature rule or optimisation outcome.
Teacher reference answers are in the guide and teacher-checkpoints.json.
The guide includes the full bilingual narration. The website caches English/Chinese audio.

Two separately saved exercise runs are also included: seed11,K1Q64 gives33.5256% field error;K2Q64 gives3.3222%,both with numerically zero training loss. These are additional demonstrations,not part of the twelve primary controls and not used for checkpoint selection. Exercise timings were measured during audio generation and should not be compared with the main timing table.
