# Paper 04: convection and coefficient continuation

Independent CPU adaptation of Krishnapriyan et al. (NeurIPS 2021), sections 3.1 and 5.1. https://arxiv.org/abs/2109.01050

Run `python -m pip install -r requirements.txt`, then `python convection_curriculum_cpu.py`. Defaults run twelve cases on four CPU threads, float64, 1297 parameters, 256 fixed residual points, 48 initial labels, 32 periodic pairs. All network initialisations are paired across policies per seed. Initial profile sin(x); periodic x in [0,2pi], time [0,1]. Analytic reference sin(x-beta*t). No interior reference labels or validation-based checkpoint selection.

Direct: target beta10 throughout four 1000-step stages. Curriculum: beta [1,3,6,10], 1000 steps each. Both have 4000 total steps. Extra-budget curriculum: same three warm-up stages, then up to 4000 target steps (7000 total), subject to a 90-second training cap. Easy beta1 is a separate-equation diagnostic, not a target-speed solution. Adam rate .001 is reset at stage boundaries in ALL policies, preserving network weights. Unit weights for residual, initial and periodic losses. Replaying a warm-up curve against the final beta10 reference is deliberately labelled.

Equal total steps is not equal final-equation training and is not exactly equal wall time. The extra-budget policy uses more computation; two measured runs hit the cap, and their ACTUAL step counts below must be used. Do not claim they completed 7000 steps. Timings depend on concurrent local CPU workload.

| Policy | Seed | Actual updates | Training seconds | Field error (%) | Budget limited |
|---|---:|---:|---:|---:|---|
| easy | 11 | 4000 | 48.9 | 0.320 | False |
| direct | 11 | 4000 | 38.2 | 0.502 | False |
| curriculum | 11 | 4000 | 52.6 | 31.192 | False |
| easy | 22 | 4000 | 57.7 | 0.703 | False |
| direct | 22 | 4000 | 42.1 | 0.741 | False |
| curriculum | 22 | 4000 | 70.3 | 47.857 | False |
| easy | 33 | 4000 | 52.2 | 0.299 | False |
| direct | 33 | 4000 | 40.6 | 0.338 | False |
| curriculum | 33 | 4000 | 81.6 | 40.358 | False |
| curriculum-extra | 11 | 6180 | 90.0 | 2.244 | True |
| curriculum-extra | 22 | 4776 | 90.0 | 35.946 | True |
| curriculum-extra | 33 | 7000 | 47.1 | 2.275 | False |

The direct beta10 baseline already works well here. Equal-total-step curriculum is worse on all measured seeds. Extra target training reduces the short-curriculum error but is still worse than direct training in these runs. These results do not reproduce the paper's higher-speed headline cases or original L-BFGS benchmark. No universal curriculum gain is claimed. The implementation does not include reaction-diffusion, sequence-to-sequence time marching or Hessian landscape analysis.

Full fields on an independent 81x21 grid, maximum error and held-out residual at 512 new points are saved. Check stage parameter checksums to verify transfer without random restarts. Exercise: `python convection_curriculum_cpu.py --target-beta 12 --output trace-beta12.json`. The explicit curriculum remains [1,3,6,target]; changing target also changes its final jump.
