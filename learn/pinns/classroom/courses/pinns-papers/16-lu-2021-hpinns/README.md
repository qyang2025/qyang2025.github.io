# Hard-constraint inverse-design teaching adaptation

Run `python thermal_design_cpu.py`. Two symmetric design variables,not arbitrary topology optimisation. All nine final results retained. Independent finite-volume verification is outside the training loop. Weak neural scores are physically false,but candidate designs may still improve verified objectives. Volume feasibility is only a budget check. See guide.html and teacher-checkpoints.json.

Run `python verify_experiment.py` to independently check analytic derivatives, saved final results and the numerical conclusions without retraining.
