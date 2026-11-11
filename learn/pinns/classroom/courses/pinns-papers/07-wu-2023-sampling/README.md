# Paper 07: Residual-adaptive sampling and boundary layers

Wu, Zhu, Tan, Kartha & Lu (CMAME 2023; preprint2022), sections2.2 and2.3.2, equation2 / Algorithm2: https://arxiv.org/abs/2207.10289

Run `python -m pip install -r requirements.txt`, then `python boundary_layer_rad_cpu.py`. This is an independent stationary advection-diffusion teaching adaptation, not a reproduction of the original six-PDE / ten-method benchmark.

Equation: u_x-nu*u_xx=0, nu=.05, x in[0,1], u(0)=0,u(1)=1. Analytic stable exponential reference. Hard field ansatz x+x(1-x)N_theta. Tanh1-24-24-24-1,1273 parameters,float64,four CPU threads,Adam.001,4000 updates,90-second training cap per run. All twelve recorded runs complete4000 updates. Three paired seeds share initial networks. No interior solution labels or validation-driven checkpoint choice.

Each policy has32 active points. Fixed grid uses midpoints. Fixed random, uniform replacement and RAD share initial32 distinct locations from the512-candidate midpoint pool. Random control is discrete-pool rather than continuous uniform sampling. Uniform replacement and RAD replace all points after500,1000,...3500 updates, retaining model parameters and Adam moments. RAD probabilities are proportional to |r|/mean(|r|)+1, with mean floor1e-14, then32 distinct points are drawn without replacement. No importance correction is applied: the empirical spatial weighting changes. No RAR-G, RAR-D, point growth, gPINN or inverse problem.

RAD incurs seven512-point scans:3584 extra residual evaluations. Search seconds, probability arrays, selected indices and point histories are saved. Probability events are paired with their own selected point set and timestamp, not the final field after more updates. Purely visual vertical jitter in point rugs does not change coordinates.

| Policy | Seed | Updates | Training seconds | Field error (%) | Slope error (%) | Extra candidate evaluations |
|---|---:|---:|---:|---:|---:|---:|
| grid | 11 | 4000 | 73.4 | 0.6824 | 2.2239 | 0 |
| random | 11 | 4000 | 78.7 | 29.2135 | 27.5561 | 0 |
| resample | 11 | 4000 | 82.2 | 1.6036 | 1.2672 | 0 |
| rad | 11 | 4000 | 69.3 | 14.5130 | 5.4950 | 3584 |
| grid | 22 | 4000 | 85.1 | 2.7052 | 2.9844 | 0 |
| random | 22 | 4000 | 79.0 | 35.6054 | 30.9147 | 0 |
| resample | 22 | 4000 | 76.9 | 1.9016 | 3.0418 | 0 |
| rad | 22 | 4000 | 77.9 | 72.5584 | 21.9815 | 3584 |
| grid | 33 | 4000 | 82.7 | 2.6257 | 5.8659 | 0 |
| random | 33 | 4000 | 82.4 | 564.9817 | 133.6564 | 0 |
| resample | 33 | 4000 | 30.4 | 4.7373 | 6.9598 | 0 |
| rad | 33 | 4000 | 24.9 | 361.0666 | 85.1308 | 3584 |

501-point field/slope and257 shifted residual validation use analytic references. All failed fits are retained. Default RAD does not beat the fixed grid on this small adaptation; some random/RAD fits are severely inaccurate. Residual magnitude is an indicator, not a true-error oracle. This does not overturn the original paper's wider benchmark evidence, nor isolate a cause for these failures. Candidate pool, policy, network and optimisation all differ from the original studies. Local wall times varied with concurrent offline narration generation and are not algorithmic speed rankings.

Physical flow markers illustrate a steady field, not numerical transient integration. To explore a thinner layer without overwriting the trace: `python boundary_layer_rad_cpu.py --nu .03 --output trace-nu03.json`. Change one factor at a time and retain all seeds.
