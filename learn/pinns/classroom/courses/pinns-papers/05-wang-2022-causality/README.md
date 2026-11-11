# Paper 05: temporal causal residual weighting

Independent oscillator adaptation of Wang, Sankaran & Perdikaris (2022), section 3, equations 3.1–3.3. https://arxiv.org/abs/2203.07404

Install `python -m pip install -r requirements.txt`, then run `python oscillator_causal_cpu.py`. Defaults: nine CPU runs, four threads, float64, 1298 parameters, 64 fixed midpoint times in eight ordered bins, 6000 Adam update ceiling and 90-second training cap per run. Three initialisations are paired across uniform, fixed-epsilon and annealed-epsilon policies. No interior reference labels, energy penalty or validation-based checkpoint selection.

Undamped oscillator u_t=omega*v, v_t=-omega*u, omega6, t=[0,1], initial(1,0). Here v is velocity divided by omega. Analytic reference (cos(omega*t),-sin(omega*t)); normalised energy u²+v²=1. Hard initial ansatz (1,0)+t*N_theta(t) is an explicit adaptation from the paper's soft initial condition. It is used in every compared policy. The physical spring animation uses the analytic motion and is not a numerical simulation.

Bin residual is averaged over eight times and both state components. Uniform weights are 1. Causal weights are exp(-epsilon * exclusive prefix sum of unweighted bin losses), with the first prefix zero and first weight 1. Prefix and weights are detached; the objective is mean(weights*bin_losses), NOT division by the sum of weights. Fixed epsilon=1. Annealed sequence [.01,.1,1,10,100], advancing on minWeight>.99 at checks every100 updates after at least200 updates per epsilon. Final-criterion attainment is recorded, but training continues to the common ceiling: this deliberately differs from the full paper's stopping algorithm. No modified MLP, time-window marching or chaotic/turbulent benchmark is implemented.

Most measured runs hit the wall-time cap and complete different update counts. Both actual counts and caps are disclosed; concurrent CPU workload affects timings. These are not equal-update or controlled-speed rankings. The uniform baseline is already accurate; no method wins every seed. A near-unit minimum gate is a training diagnostic, not a rigorous trajectory-error certificate.

| Policy | Seed | Actual updates | Training seconds | State error (%) | Final epsilon | Min gate | Capped |
|---|---:|---:|---:|---:|---:|---:|---|
| uniform | 11 | 5867 | 90.0 | 0.1053 | 0.0 | 1.0000 | True |
| fixed | 11 | 4121 | 90.0 | 0.0974 | 1.0 | 0.9996 | True |
| annealed | 11 | 6000 | 77.9 | 0.1924 | 100.0 | 0.9401 | False |
| uniform | 22 | 3429 | 90.0 | 0.2483 | 0.0 | 1.0000 | True |
| fixed | 22 | 5837 | 90.0 | 0.0478 | 1.0 | 0.9998 | True |
| annealed | 22 | 3166 | 90.0 | 0.1398 | 10.0 | 0.9859 | True |
| uniform | 33 | 5282 | 90.0 | 0.1704 | 0.0 | 1.0000 | True |
| fixed | 33 | 4146 | 90.0 | 0.2842 | 1.0 | 0.9985 | True |
| annealed | 33 | 4374 | 90.0 | 0.1618 | 10.0 | 0.9863 | True |

Independent validation uses 201 times for both states, maximum normalised-energy deviation, exact initial state and residuals at128 shifted times. All failures, capped runs, epsilon transitions and gate vectors are retained. Exercise: `python oscillator_causal_cpu.py --omega 8 --output trace-omega8.json`. Keep all other settings fixed and inspect actual updates before attributing an error difference to a weighting policy. Avoid overwriting the published trace.
