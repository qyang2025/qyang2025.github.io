# Bayesian PINN CPU teaching adaptation

Run `python bpinn_nuts_cpu.py`. Full11-dimensional BNN posterior; NUTS not restart ensemble. Fixed invertible Hessian-based transform is preconditioning,not a Gaussian approximation. Four chains per noise level,400warmup+500draws. Initial90-second cap; timeout/divergence retries use targetaccept.99 and180seconds. Original failed attempt in trace-failure.json; original divergent low11 chain nested in trace.json previousAttempt. Final zero divergences do not certify convergence: k Rhat1.020/1.011; weight Rhat remains large. Known noise and tiny network,not original benchmark reproduction.

Run `python verify_experiment.py` to independently check analytic derivatives, saved final results and the numerical conclusions without retraining.
