# Self-adaptive residual-mask teaching adaptation

Run `python soft_attention_cpu.py`,then `python verify_experiment.py`. Default includes12matched2000-update runs and a separately labelled8000-update fixed64 seed11 diagnostic.97network parameters,hard endpoints,fixed point locations,Adam network descent and mask ascent. All masks start at1,a deliberate departure from original random initialisation. No L-BFGS or GP interpolation. Original Burgers/Helmholtz/Allen-Cahn benchmarks are not reproduced. Learned masks are neither probabilities nor confidence estimates.

To rerun only the diagnostic without changing the main trace:
`python soft_attention_cpu.py --kinds fixed64 --steps 8000 --seeds 11 --output new-diagnostic.json`

All failed final outcomes are retained. Validate dense field errors,held-out residuals and changing weighted losses separately.
