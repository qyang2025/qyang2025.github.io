# Paper 06: gPINN and spatial residual derivatives

Yu, Lu, Meng & Karniadakis (CMAME 2022; preprint 2021), sections 2.2/3.2.1: https://arxiv.org/abs/2111.02801

Run `python -m pip install -r requirements.txt`, then `python poisson_gpinn_cpu.py`. The original 1-D equation and hard boundary ansatz are retained. Network and update budget differ: tanh 1–24–24–24–1, 1273 parameters, float64, four CPU threads, 4000 Adam updates, learning rate .001, 90-second training cap per case. All twelve measured cases finish the full update budget.

Original equation: -u_xx=sum(j*sin(j*x),j=1..4)+8*sin(8x), x in [0,pi], u(0)=0,u(pi)=pi. Analytic solution x+sum(sin(j*x)/j,j=1..4)+sin(8x)/8. Hard ansatz u=x+x(pi-x)*N_theta(x) is shared by every policy. No interior field or solution-slope labels enter training. Known analytic source derivatives are forcing information, not reference-slope supervision.

Policies: PINN16, PINN32, gPINN16 gamma .01, gPINN16 gamma1. Three paired seeds 11/22/33, same initial network per seed. Residual and residual-gradient penalties use the same midpoint coordinates. The added spatial derivative of r=-u_xx-source involves u_xxx and the known source derivative. It is distinct from the loss gradient with respect to trainable parameters.

| Policy | Seed | Points | Gradient weight | Training seconds | Field error (%) | Slope error (%) |
|---|---:|---:|---:|---:|---:|---:|
| pinn16 | 11 | 16 | 0.0 | 62.7 | 3.3981 | 9.5660 |
| pinn32 | 11 | 32 | 0.0 | 29.4 | 0.0044 | 0.0768 |
| gpinn001 | 11 | 16 | 0.01 | 50.1 | 0.0653 | 0.1677 |
| gpinn1 | 11 | 16 | 1.0 | 59.9 | 0.2019 | 0.7411 |
| pinn16 | 22 | 16 | 0.0 | 29.6 | 0.2095 | 2.6413 |
| pinn32 | 22 | 32 | 0.0 | 27.1 | 0.0071 | 0.0983 |
| gpinn001 | 22 | 16 | 0.01 | 57.5 | 0.0494 | 0.1656 |
| gpinn1 | 22 | 16 | 1.0 | 54.0 | 0.4391 | 1.0918 |
| pinn16 | 33 | 16 | 0.0 | 31.0 | 0.4502 | 3.7519 |
| pinn32 | 33 | 32 | 0.0 | 42.7 | 0.1037 | 0.3970 |
| gpinn001 | 33 | 16 | 0.01 | 62.5 | 0.3693 | 0.7769 |
| gpinn1 | 33 | 16 | 1.0 | 49.1 | 0.1562 | 0.5341 |

Independent grid201 points checks analytic field and spatial slope. Held-out residual and residual-gradient MSE use257 shifted points. No reference labels or validation-guided checkpoint selection. All modes and seeds are retained. The denser ordinary baseline is very accurate; best enhancement weight varies by seed. Fewer points do not imply lower CPU cost because extra differentiation graphs add work. No universal efficiency ranking is claimed.

The physical rod sketch ramps through static source equilibria, not transient heat integration. The local tangent and cosine-squared residual illustration are logical diagrams, not saved training predictions. For the 16 midpoint locations x=(j+.5)*pi/16, cos(16*x)^2 has zero value AND first derivative at those locations but is nonzero between them, showing that sampled constraints alone are not a global certificate.

This episode does not implement inverse problems, higher-dimensional examples or RAR. The original Poisson experiment used a different network and20000 Adam updates. Save follow-up runs to a new output: `python poisson_gpinn_cpu.py --output trace-new.json`. Policy point counts and weights are explicitly listed near run(); change only one factor in a copied script.
