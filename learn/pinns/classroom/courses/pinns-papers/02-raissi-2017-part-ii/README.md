# Paper 02: Burgers coefficient identification

Independent CPU teaching adaptation of Raissi, Perdikaris & Karniadakis (2017), Part II, section 2.1: https://arxiv.org/abs/1711.10566

Run `python -m pip install -r requirements.txt`, then `python burgers_inverse_cpu.py`. Python 3.12; four CPU threads; float64; 1,299 parameters; 256 scattered observations. Residual tests use the same observation coordinates. No separate initial/boundary labels enter training. Each run has a 90-second training cap. Browser playback replays saved results and performs no training.

The teaching truth is lambda1=1, lambda2=0.05, t in [0,0.5]. The original paper uses lambda2=0.01/pi, 2,000 observations and a larger network. These are method demonstrations, not original benchmark reproductions. Cole-Hopf quadrature generates synthetic observations and independent validation. Truth coefficients and oracle derivatives never enter the optimisation objective; oracle derivatives only diagnose implementation correctness.

Measured runs on this machine:

| Case | lambda1 | lambda2 | Field relative L2 | Training seconds |
|---|---:|---:|---:|---:|
| Clean | 0.991362 | 0.049467 | 0.51% | 16.6 |
| 1% noise | 0.983357 | 0.049225 | 0.52% | 15.0 |
| Data-only | 0.5 | 0.1 | 0.52% | 4.4 |

Noise standard deviation is 1% of the standard deviation of clean observations, seed 71. This is one noise realisation, not uncertainty quantification. The data-only objective in this architecture does not depend on the coefficient parameters, so they remain at initial values despite a good field fit. This does not rule out identifying coefficients using other derivative/regression methods. Timings are not a fair algorithm speed ranking.

The centre-sensor counterexample compares three real reference solutions: their entire centre histories vanish but their spatial curves differ. Observation placement matters.

Exercise: `python burgers_inverse_cpu.py --noise .05 --output trace-noise05.json`. Change one factor and keep seeds fixed. Do not overwrite the published trace unintentionally. Open guide.html for the complete bilingual teaching script.
