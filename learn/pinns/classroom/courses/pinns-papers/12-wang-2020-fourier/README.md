# Paper12: Fourier features and eigenvector bias
Primary paper: https://arxiv.org/abs/2012.10047
Run `python fourier_poisson_cpu.py` after installing requirements. CPU only, four threads, three seeds, four representations, 2000 Adam steps each. Modified settings require `--output exploratory.json`.
This is a compact teaching adaptation, not an original-benchmark reproduction. Full protocol, every outcome and limits are in guide.html. Negative temperatures are relative to a reference. The source is prescribed; interior exact temperatures are validation only. Multiscale failures are retained: a larger bandwidth does not guarantee an improvement. The initial output NTK is a diagnostic, not the complete PINN derivative kernel.
Files: trace.json actual checkpoints; fourier_poisson_cpu.py implementation; teacher-checkpoints.json reference answers; experiment-evidence.json reviewed canonical hash.
