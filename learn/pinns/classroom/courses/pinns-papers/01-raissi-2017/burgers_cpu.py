"""Paper 01: small CPU implementation of Raissi et al. (2017), section 2.1.
Same Burgers PDE, viscosity and initial/boundary data; shortened time window.
Not the original full-window accuracy benchmark. Reference: Cole-Hopf quadrature.
Run: python burgers_cpu.py --output trace.json [--seconds 90]
"""
import argparse, json, math, time, platform
from pathlib import Path
import numpy as np
import torch
from torch import nn
NU=0.01/math.pi
T_END=0.2

def reference(x,t,n=96):
    x,t=np.broadcast_arrays(np.asarray(x,dtype=float),np.asarray(t,dtype=float))
    z,w=np.polynomial.hermite.hermgauss(n)
    y=x[...,None]+np.sqrt(4*NU*t[...,None])*z
    a=-np.cos(math.pi*y)/(2*math.pi*NU)
    a-=a.max(axis=-1,keepdims=True)
    weights=np.exp(a)*w
    return -(np.sin(math.pi*y)*weights).sum(-1)/weights.sum(-1)

def terms(net,xt):
    q=xt.detach().clone().requires_grad_(True)
    u=net(q)
    g=torch.autograd.grad(u,q,torch.ones_like(u),create_graph=True)[0]
    ux,ut=g[:,0:1],g[:,1:2]
    uxx=torch.autograd.grad(ux,q,torch.ones_like(ux),create_graph=True)[0][:,0:1]
    return u,ut,ux,uxx

class Field(nn.Module):
    def __init__(self):
        super().__init__();self.net=nn.Sequential(nn.Linear(2,24),nn.Tanh(),nn.Linear(24,24),nn.Tanh(),nn.Linear(24,24),nn.Tanh(),nn.Linear(24,1))
    def forward(self,q):
        return self.net(torch.stack((q[:,0],2*q[:,1]/T_END-1),dim=1))

def run(kind,seconds):
    torch.manual_seed(11);net=Field();parameters=sum(p.numel() for p in net.parameters())
    x0=torch.linspace(-1,1,48).reshape(-1,1);t0=torch.zeros_like(x0)
    tb=torch.linspace(0,T_END,24).reshape(-1,1)
    labels=torch.cat((torch.cat((x0,t0),1),torch.cat((-torch.ones_like(tb),tb),1),torch.cat((torch.ones_like(tb),tb),1)))
    values=torch.cat((-torch.sin(math.pi*x0),torch.zeros_like(tb),torch.zeros_like(tb)))
    collocation=torch.rand((384,2));collocation[:,0]=2*collocation[:,0]-1;collocation[:,1]*=T_END
    x=np.linspace(-1,1,81);times=np.linspace(0,T_END,17);xx,tt=np.meshgrid(x,times)
    grid=torch.tensor(np.stack((xx.ravel(),tt.ravel()),1));truth=reference(xx,tt);frames=[]
    start=time.perf_counter();calls=0;stage='adam'
    def loss():
        nonlocal calls
        calls+=1;data=((net(labels)-values)**2).mean()
        if kind=='pinn':
            u,ut,ux,uxx=terms(net,collocation);pde=((ut+u*ux-NU*uxx)**2).mean()
        else:pde=torch.zeros(())
        return data+pde,data,pde
    def record(step):
        with torch.no_grad():prediction=net(grid).numpy().reshape(xx.shape)
        _,ld,lf=loss()
        frames.append({'step':step,'phase':stage,'seconds':time.perf_counter()-start,'dataMSE':float(ld.detach()),'physicsMSE':float(lf.detach()),'relativeL2':float(np.linalg.norm(prediction-truth)/np.linalg.norm(truth)),'curve':prediction[-1].tolist()})
    record(0);opt=torch.optim.Adam(net.parameters(),lr=0.001)
    for step in range(1,1801):
        if time.perf_counter()-start>seconds*0.65:break
        opt.zero_grad();total,_,_=loss();total.backward();opt.step()
        if step%150==0:record(step)
    record(step);stage='lbfgs';opt=torch.optim.LBFGS(net.parameters(),max_iter=180,history_size=30,line_search_fn='strong_wolfe',tolerance_grad=1e-8,tolerance_change=1e-12)
    def closure():
        if time.perf_counter()-start>seconds:raise TimeoutError('CPU budget reached')
        opt.zero_grad();total,_,_=loss();total.backward();return total
    limited=False
    try:opt.step(closure)
    except TimeoutError:limited=True
    record(step);elapsed=time.perf_counter()-start
    generator=torch.Generator().manual_seed(97);q=torch.rand((512,2),generator=generator);q[:,0]=q[:,0]*2-1;q[:,1]*=T_END
    u,ut,ux,uxx=terms(net,q);res=float(((ut+u*ux-NU*uxx)**2).mean().detach())
    with torch.no_grad():pred=net(grid).numpy().reshape(xx.shape)
    return {'kind':kind,'parameters':parameters,'seconds':elapsed,'budgetLimited':limited,'objectiveCalls':calls,'heldoutResidualMSE':res,'relativeL2':float(np.linalg.norm(pred-truth)/np.linalg.norm(truth)),'maxAbsError':float(np.max(np.abs(pred-truth))),'frames':frames,'field':pred.tolist()}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',default=str(Path(__file__).with_name('trace.json')));parser.add_argument('--seconds',type=float,default=90);args=parser.parse_args()
    torch.set_num_threads(4);torch.set_default_dtype(torch.float64)
    x=np.linspace(-1,1,81);times=np.linspace(0,T_END,17);xx,tt=np.meshgrid(x,times);truth=reference(xx,tt)
    refinement=float(np.max(np.abs(truth-reference(xx,tt,160))))
    assert refinement<1e-7,refinement
    assert np.max(np.abs(reference(x,0)+np.sin(math.pi*x)))<1e-12
    assert np.max(np.abs(reference(np.array([-1.,1.])[:,None],times[None,:])))<1e-12
    # Independent analytic function checks the derivative ordering used in code.
    q=torch.rand(7,2,requires_grad=True);u=q[:,0:1]**3+q[:,1:2]**2;g=torch.autograd.grad(u,q,torch.ones_like(u),create_graph=True)[0];g2=torch.autograd.grad(g[:,0:1],q,torch.ones_like(u))[0]
    assert torch.allclose(g[:,1],2*q[:,1]) and torch.allclose(g2[:,0],6*q[:,0])
    result={'paper':'https://arxiv.org/abs/1711.10561','scope':'Short-window continuous-time Burgers teaching implementation; not a full paper benchmark reproduction','config':{'nu':NU,'timeEnd':T_END,'seed':11,'layers':[2,24,24,24,1],'initialPoints':48,'boundaryPoints':48,'collocationPoints':384,'threads':4,'dtype':'float64','perRunBudgetSeconds':args.seconds,'torch':torch.__version__,'python':platform.python_version()},'reference':{'method':'Cole-Hopf Gauss-Hermite quadrature','nodes':96,'refinementMaxDifference':refinement},'x':x.tolist(),'times':times.tolist(),'truth':truth.tolist(),'runs':{}}
    for kind in ['pinn','data-only']:
        result['runs'][kind]=run(kind,args.seconds);r=result['runs'][kind];print(json.dumps({'kind':kind,'seconds':r['seconds'],'relativeL2':r['relativeL2'],'parameters':r['parameters'],'heldoutResidualMSE':r['heldoutResidualMSE']}),flush=True)
    Path(args.output).write_text(json.dumps(result),encoding='utf-8')
if __name__=='__main__':main()
