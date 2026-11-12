# Paper 08: cPINN and conservative material interfaces

Jagtap, Kharazmi & Karniadakis (2020): https://doi.org/10.1016/j.cma.2020.113028 ; authors' implementation: https://github.com/AmeyaJagtap/Conservative_PINNs

Run `python -m pip install -r requirements.txt`, then `python composite_rod_cpu.py`. This is an independent two-material steady-conduction teaching adaptation of state/flux coupling, not a reproduction of the original nonlinear PDE benchmarks, XPINNs or parallel execution.

Rod x=[0,1],perfect joint at a=.5,kL=1,kR=4,uniform source s=1. Exterior temperatures uL(0)=1,uR(1)=0. Local equation -k*u_xx=s;positive-right heat flux q=-k*u_x. Perfect-contact state continuity and no interfacial source/storage imply matching state and common-oriented flux. Equal slopes would be physically wrong for differing conductivities. Analytic q=x+1.25;uL=1-x*x/2-1.25*x;uR=.25-((x*x-.25)/2+1.25*(x-.5))/4;interface u=.25,q=1.75.

Two fixed tanh1-16-16-1 networks,642 parameters total. Hard exterior ansatz: uL=1+x*NL(x),uR=(1-x)*NR(x);networks receive local coordinates mapped to[-1,1]. Each half uses32 fixed midpoint residual locations excluding the joint. Float64,four CPU threads,1500 Adam updates at.001,90-second training cap. All twelve runs finish the common1500-update budget. Seeds11/22/33 pair the same initial networks across all four interface ablations.

Joint objective: half the sum of the local residual means plus wu*(uL(a)-uR(a))^2+wq*(qL(a)-qR(a))^2. Weights are0 or10: none,state only,flux only,both. Differentiable average-state squared distances sum to half the squared jump,so direct jump coupling preserves that idea up to scaling. Original per-domain normalisation,optimisers,adaptive activations and exterior-loss treatment are explicitly not reproduced. No interface reference labels,gPINN,resampling or distributed speedup. A finite penalty is not an exact hard interface constraint.

| Policy | Seed | Updates | Training seconds | Field error(%) | Flux error(%) | Absolute state jump | Absolute flux jump |
|---|---:|---:|---:|---:|---:|---:|---:|
| none | 11 | 1500 | 22.4 | 62.04268 | 96.82326 | 9.540e-01 | 5.625e-01 |
| state | 11 | 1500 | 53.4 | 4.75571 | 13.38512 | 2.766e-05 | 4.076e-01 |
| flux | 11 | 1500 | 69.3 | 69.33341 | 91.47619 | 1.014e+00 | 1.297e-04 |
| full | 11 | 1500 | 47.3 | 0.04605 | 0.19917 | 5.137e-04 | 2.398e-05 |
| none | 22 | 1500 | 76.8 | 63.21507 | 109.85736 | 1.000e+00 | 9.655e-01 |
| state | 22 | 1500 | 67.7 | 6.79828 | 19.12352 | 4.050e-05 | 5.834e-01 |
| flux | 22 | 1500 | 69.1 | 65.17081 | 85.97942 | 9.534e-01 | 1.269e-04 |
| full | 22 | 1500 | 57.8 | 0.08605 | 0.33785 | 9.867e-04 | 1.444e-04 |
| none | 33 | 1500 | 68.5 | 62.15845 | 105.12446 | 9.765e-01 | 8.482e-01 |
| state | 33 | 1500 | 87.7 | 13.38228 | 37.60482 | 1.122e-04 | 1.147e+00 |
| flux | 33 | 1500 | 75.7 | 64.30675 | 84.91418 | 9.409e-01 | 3.411e-05 |
| full | 33 | 1500 | 79.5 | 0.08048 | 0.29891 | 1.130e-03 | 1.267e-04 |

Validate against301 analytic field/flux locations and257 shifted residual coordinates. Report both interface jumps and global balance defect qR(1)-qL(0)-1. No reference values enter training or choose a checkpoint. Missing-condition variants are diagnostic ablations,not equally valid physical models. All runs and remaining finite errors are retained. Local timings include common recording overhead and concurrent offline narration work,so no algorithmic timing or parallel speedup ranking is made.

Temperature curves are drawn separately across the joint to expose jumps. Flow markers illustrate steady heat flow,not transient integration. Change only material contrast with `python composite_rod_cpu.py --k-right 2 --output trace-k2.json`;retain every seed and avoid overwriting the published record.
