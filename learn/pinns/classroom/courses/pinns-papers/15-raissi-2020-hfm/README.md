# HFM teaching adaptation

Run `python tracer_flow_cpu.py`. Constant velocity and pressure satisfy fluid equations by construction. This does not reproduce general hidden velocity/pressure fields. Full, noisy, data-only and stripe controls use three seeds each. All final results are retained. See guide.html and teacher-checkpoints.json.

Run `python verify_experiment.py` to independently check analytic derivatives, saved final results and the numerical conclusions without retraining.
