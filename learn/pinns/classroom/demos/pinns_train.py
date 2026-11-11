"""Independent synthetic PINN lab. Run using .venv-pinns/Scripts/python.exe.
PyTorch CPU. Dimensionless heat problem, alpha=0.1, sine initial data.
Outputs trace JSON used for classroom replay. No paper figures or metrics reused.
"""
import json, math, time
from pathlib import Path
import torch
from torch import nn

torch.set_num_threads(4)
torch.set_default_dtype(torch.float64)
TRUE_ALPHA=0.1

def exact(xt, alpha=TRUE_ALPHA):
    return torch.sin(math.pi*xt[:,0:1])*torch.exp(-alpha*math.pi**2*xt[:,1:2])

def derivatives(net, xt):
    q=xt.detach().clone().requires_grad_(True)
    u=net(q)
    du=torch.autograd.grad(u,q,torch.ones_like(u),create_graph=True)[0]
    ux,ut=du[:,0:1],du[:,1:2]
    uxx=torch.autograd.grad(ux,q,torch.ones_like(ux),create_graph=True)[0][:,0:1]
    return u,ut,uxx

def run(kind,steps=2200):
    torch.manual_seed(7)
    net=nn.Sequential(nn.Linear(2,24),nn.Tanh(),nn.Linear(24,24),nn.Tanh(),nn.Linear(24,1))
    raw_alpha=nn.Parameter(torch.tensor(-1.0))
    inverse=kind=='inverse'
    params=list(net.parameters())+([raw_alpha] if inverse else [])
    opt=torch.optim.Adam(params,lr=0.002)
    # Held fixed for reproducibility; validation uses different coordinates.
    interior=torch.rand(256,2)
    xi=torch.rand(96,1); initial=torch.cat([xi,torch.zeros_like(xi)],1)
    tb=torch.rand(96,1); boundary=torch.cat([torch.cat([torch.zeros_like(tb),tb],1),torch.cat([torch.ones_like(tb),tb],1)],0)
    obs=torch.rand(64,2);obs[:,1]=0.15+0.75*obs[:,1]
    observed=exact(obs)+0.005*torch.randn(64,1)
    xs=torch.linspace(0,1,81)
    test=torch.cartesian_prod(torch.linspace(0,1,61),torch.linspace(0,1,41))
    view=torch.stack([xs,torch.full_like(xs,.5)],1)
    truth=exact(test); frames=[];started=time.time()
    for epoch in range(steps+1):
        alpha=torch.nn.functional.softplus(raw_alpha)+1e-6 if inverse else torch.tensor(TRUE_ALPHA)
        _,ut,uxx=derivatives(net,interior)
        pde=((ut-alpha*uxx)**2).mean()
        ic=((net(initial)-exact(initial))**2).mean()
        bc=(net(boundary)**2).mean()
        data=((net(obs)-observed)**2).mean() if inverse else torch.tensor(0.)
        loss=pde+bc+(0 if kind=='missing-ic' else 10*ic)+(10*data if inverse else 0)
        if epoch%50==0 or epoch==steps:
            with torch.no_grad():
                rel=(torch.linalg.vector_norm(net(test)-truth)/torch.linalg.vector_norm(truth)).item()
                frames.append(dict(epoch=epoch,alpha=float(alpha.detach()),loss=float(loss.detach()),pde=float(pde.detach()),ic=float(ic.detach()),bc=float(bc.detach()),data=float(data.detach()),relativeL2=rel,curve=net(view).flatten().tolist()))
        if epoch<steps:
            opt.zero_grad();loss.backward();opt.step()
    # Independent random validation residual, including locations never optimized.
    torch.manual_seed(1007);probe=torch.rand(1024,2)
    _,ut,uxx=derivatives(net,probe)
    alpha=float(torch.nn.functional.softplus(raw_alpha).detach()+1e-6) if inverse else TRUE_ALPHA
    residual=float(((ut-alpha*uxx)**2).mean().detach())
    result=dict(kind=kind,seed=7,steps=steps,seconds=time.time()-started,x=xs.tolist(),time=.5,truth=exact(view).flatten().tolist(),frames=frames,validationResidualMSE=residual,observations={'xt':obs.tolist(),'u':observed.flatten().tolist()} if inverse else None)
    print(kind,'seconds',round(result['seconds'],2),'L2',frames[-1]['relativeL2'],'alpha',alpha,flush=True)
    return result

if __name__=='__main__':
    results={kind:run(kind,3000 if kind=='inverse' else 2200) for kind in ['forward','inverse','missing-ic']}
    out=Path(__file__).with_name('pinns-traces.json')
    out.write_text(json.dumps(dict(problem='dimensionless unit heat equation',trueAlpha=TRUE_ALPHA,torchVersion=torch.__version__,dtype='float64',threads=4,runs=results)),encoding='utf-8')
    assert results['forward']['frames'][-1]['relativeL2']<0.15
    assert results['missing-ic']['frames'][-1]['relativeL2']>0.5
    assert abs(results['inverse']['frames'][-1]['alpha']-TRUE_ALPHA)<0.06
