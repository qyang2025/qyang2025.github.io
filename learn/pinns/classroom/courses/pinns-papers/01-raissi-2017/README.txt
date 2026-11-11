PINNs Paper 01: Raissi, Perdikaris and Karniadakis (2017), Part I
Primary paper: https://arxiv.org/abs/1711.10561

This is an independent small PyTorch implementation of the continuous-time Burgers method in section 2.1. It preserves viscosity 0.01/pi and the sine initial / zero endpoint conditions. The time interval is shortened to [0,0.2]; network size, collocation count and optimiser schedule differ from the full paper benchmark. No claim of reproducing its reported accuracy.

Create an isolated Python environment, then run python -m pip install -r requirements-cpu.txt. The requirements pin a CPU PyTorch build from the official PyTorch wheel index. Tested versions are recorded in trace.json. Then run:
  python burgers_cpu.py --seconds 90 --output trace-new.json
The time cap applies to each training run; startup and validation add overhead. It runs a PINN and a data-only control. Four CPU threads, float64, seed 11. No GPU, external training data or large reference simulation is required.

Reference checks: Cole-Hopf Gauss-Hermite quadrature refined from 96 to 160 nodes; initial/endpoints and analytic derivative-order tests; 81x17 independent solution grid and 512 new residual points. The quadrature is a numerical evaluation of an analytical representation, not an exact floating-point oracle.

trace.json is the actual executed experiment record. It contains PINN and control curves, losses, relative error, runtime, model configuration and independent residual checks. Gold checkpoints in the classroom are replayed from these saved arrays. They are never fabricated or trained in the browser. A single seeded run is diagnostic, not a statistical paper benchmark.

1.json contains the editable bilingual presentation, narration, expressions and pointing cues. guide.html contains the full script and links. The narrated 3D classroom runs on the author's published website; the small archive does not embed its shared renderer, voice recordings or model weights.
