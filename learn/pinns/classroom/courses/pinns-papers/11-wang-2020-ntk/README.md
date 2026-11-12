# Paper11 — Empirical PINN kernels and trace-based loss weights

Primary reference: Wang,Yu,Perdikaris (2020 preprint), https://arxiv.org/abs/2007.14527. See sections3–6 and Algorithm1.

Independent small steady heated-rod adaptation: -u_xx=pi^2*sin(pi*x), x in(0,1),zero endpoints. Reference sin(pi*x) is validation only. This is not the original width100/500 or wave benchmark, nor a verification of infinite-width constant-kernel theorems.

Run `python -m pip install -r requirements.txt`, then `python poisson_ntk_cpu.py`. Exploratory settings require `--output new-file.json`. A width32 single-hidden-layer tanh network has97 parameters; output scales by1/sqrt(width), all initial trainable parameters are standard normal. Float64,four CPU threads,24 fixed residual midpoints,2 endpoints,2400 full-batch SGD updates,90-second per-run cap. Actual runs took about10–14seconds here; hardware differs.

The half-mean loss is represented by Jacobian rows divided by sqrt(N). K=J J^T. Trace weights are (Tb+Tr)/Tb and (Tb+Tr)/Tr with detached trace statistics. Unit,frozen initial-trace and refresh-every400-step weights are compared for paired seeds11,22,33. Each seed uses the same fixed step across policies:0.05/max(initial largest unit eigenvalue,initial largest trace-weighted eigenvalue). This initial heuristic is not a global stability guarantee. No validation-selected checkpoints or learning-rate retuning during a run.

All final fields and kernel snapshots are retained. Final field errors are independently measured on301 points;257 shifted locations audit residuals. Kernel drift is substantial and is not hidden. Frozen continuous-flow diagnostics use initial errors and the symmetric weighted kernel, with optimisation time eta*step; they are not exact discrete SGD predictions. Round-off negative eigenvalues are clamped only in that diagnostic, while raw eigenvalues remain in the record.

A development pilot with factor0.5 failed in adaptive seed11; pilot-trace.json contains its two completed controls and pilot-note.json records the failure. All final policies and seeds were rerun uniformly with factor0.05. Do not mix pilot outcomes into the final nine-run table. Trace balance does not equalise all eigenmodes, remove cross coupling or resolve spectral bias. Timings include checkpoint work and do not establish speedup at equal accuracy.
