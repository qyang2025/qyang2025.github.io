# Physics-informed DeepONet CPU teaching adaptation

Primary paper: https://arxiv.org/abs/2103.10974

Install requirements, run `python physics_operator_cpu.py`, then `python verify_experiment.py`. One CPU thread; nine runs with 2400 Adam updates each and a 90-second cap per run. Same 465-parameter architecture and paired initial weights across data-only (72 labels), physics-only (0 output labels, 384 residual constraints) and hybrid.

Known source functions, equations and endpoint conditions are still information. Analytic trunk derivatives are checked against full autodiff, including parameter gradients. Independent fields and shifted residuals are retained for all final models and three input groups. This finite three-sine Poisson example does not reproduce the original large benchmarks or establish arbitrary-input performance. See guide.html for protocol and all outcomes.
