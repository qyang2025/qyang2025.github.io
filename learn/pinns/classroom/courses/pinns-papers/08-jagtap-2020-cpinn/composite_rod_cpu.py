"""Independent two-material heat-conduction adaptation of cPINN interfaces.
Jagtap, Kharazmi & Karniadakis (2020), DOI10.1016/j.cma.2020.113028.
Not the paper's Burgers/NS/Euler benchmarks or parallel implementation.
"""
import argparse,json,platform,time
from pathlib import Path
import numpy as np
import torch
from torch import nn
class Rod(nn.Module):
    def __init__(self,seed):
        super().__init__();torch.manual_seed(seed)
        def net():
            m=nn.Sequential(nn.Linear(1,16),nn.Tanh(),nn.Linear(16,16),nn.Tanh(),nn.Linear(16,1))
            for l in m:
                if isinstance(l,nn.Linear):nn.init.xavier_normal_(l.weight);nn.init.zeros_(l.bias)
            return m
        self.left=net();self.right=net()
    def field(self,x,side):return 1+x*self.left(4*x-1) if side=='left' else (1-x)*self.right(4*x-3)
def exact(x,k_right):
    a=.5+.5/k_right;b=.125+.375/k_right;c=(1-b)/a;ui=1-.125-.5*c
    return torch.where(x<=.5,1-.5*x*x-c*x,ui-(.5*(x*x-.25)+c*(x-.5))/k_right)
def exact_flux(x,k_right):
    c=(1-(.125+.375/k_right))/(.5+.5/k_right);return x+c

def fields(model,x,side,k_right):
    q=x.detach().clone().requires_grad_(True);u=model.field(q,side);ux=torch.autograd.grad(u,q,torch.ones_like(u),create_graph=True)[0];uxx=torch.autograd.grad(ux,q,torch.ones_like(ux),create_graph=True)[0];k=1. if side=='left' else k_right
    return u,-k*ux,-k*uxx-1

def interface(model,k_right):
    x=torch.tensor([[.5]]);ul,ql,_=fields(model,x,'left',k_right);ur,qr,_=fields(model,x,'right',k_right)
    return ul,ur,ql,qr

def run(kind,seed,k_right,steps,seconds,grid):
    model=Rod(seed);parameters=list(model.parameters());checksum=float(torch.cat([p.detach().flatten() for p in parameters]).sum());opt=torch.optim.Adam(parameters,lr=.001)
    xl=(torch.arange(32).reshape(-1,1)+.5)/64;xr=.5+xl;left=grid<=.5;truth=exact(grid,k_right);truthq=exact_flux(grid,k_right);frames=[];limited=False
    wu=10. if kind in ['state','full'] else 0.;wq=10. if kind in ['flux','full'] else 0.;start=time.perf_counter()
    def record(step):
        ul,ql,rl=fields(model,grid,'left',k_right);ur,qr,rr=fields(model,grid,'right',k_right);u=torch.where(left,ul,ur);q=torch.where(left,ql,qr);ui,uj,qi,qj=interface(model,k_right)
        frames.append({'step':step,'seconds':time.perf_counter()-start,'relativeL2':float(((u-truth).norm()/truth.norm()).detach()),'fluxError':float(((q-truthq).norm()/truthq.norm()).detach()),'stateJump':float((ui-uj).detach().item()),'fluxJump':float((qi-qj).detach().item()),'interfaceU':[float(ui.detach().item()),float(uj.detach().item())],'interfaceQ':[float(qi.detach().item()),float(qj.detach().item())],'curve':u.detach().flatten().tolist(),'flux':q.detach().flatten().tolist()})
    record(0)
    for step in range(1,steps+1):
        if time.perf_counter()-start>seconds:limited=True;step-=1;break
        opt.zero_grad();_,_,rl=fields(model,xl,'left',k_right);_,_,rr=fields(model,xr,'right',k_right);ul,ur,ql,qr=interface(model,k_right)
        loss=.5*(rl.square().mean()+rr.square().mean())+wu*(ul-ur).square().mean()+wq*(ql-qr).square().mean();loss.backward();opt.step()
        if step%200==0:record(step)
    if frames[-1]['step']!=step:record(step)
    train_seconds=time.perf_counter()-start;last=frames[-1];held=(torch.arange(257).reshape(-1,1)+.37)/257;_,_,rl=fields(model,held[held[:,0]<.5],'left',k_right);_,_,rr=fields(model,held[held[:,0]>.5],'right',k_right)
    ul0,q0,_=fields(model,torch.tensor([[0.]]),'left',k_right);ur1,q1,_=fields(model,torch.tensor([[1.]]),'right',k_right)
    return {'kind':kind,'seed':seed,'parameters':sum(p.numel() for p in parameters),'steps':step,'seconds':train_seconds,'budgetLimited':limited,'initialChecksum':checksum,'stateWeight':wu,'fluxWeight':wq,'boundaryValues':[float(ul0.detach().item()),float(ur1.detach().item())],'heldoutResidualMSE':float(torch.cat([rl,rr]).square().mean().detach()),'globalBalanceDefect':float((q1-q0-1).detach().item()),'relativeL2':last['relativeL2'],'fluxError':last['fluxError'],'stateJump':last['stateJump'],'fluxJump':last['fluxJump'],'interfaceU':last['interfaceU'],'interfaceQ':last['interfaceQ'],'field':last['curve'],'flux':last['flux'],'frames':frames}
def main():
    p=argparse.ArgumentParser();p.add_argument('--k-right',type=float,default=4);p.add_argument('--steps',type=int,default=1500);p.add_argument('--seconds',type=float,default=90);p.add_argument('--seeds',default='11,22,33');p.add_argument('--output',default=str(Path(__file__).with_name('trace.json')));a=p.parse_args()
    if not 1<=a.k_right<=10 or not 1<=a.steps<=10000 or not 1<=a.seconds<=300:p.error('Use k-right1..10,steps1..10000,seconds1..300.')
    seeds=[int(s) for s in a.seeds.split(',')]
    if not 1<=len(seeds)<=5:p.error('Use one to five seeds.')
    torch.set_num_threads(4);torch.set_default_dtype(torch.float64);grid=torch.linspace(0,1,301).reshape(-1,1);truth=exact(grid,a.k_right);truthq=exact_flux(grid,a.k_right)
    result={'paper':'https://doi.org/10.1016/j.cma.2020.113028','scope':'Independent steady two-material conduction adaptation of flux and state interface coupling, not the original nonlinear conservation-law benchmarks or parallel speedup study.','config':{'kLeft':1.,'kRight':a.k_right,'interface':.5,'source':1.,'layersPerDomain':[1,16,16,1],'pointsPerDomain':32,'threads':4,'dtype':'float64','learningRate':.001,'steps':a.steps,'seeds':seeds,'interfacePenalty':10.,'hardExternalBoundaries':True,'jointOptimiser':True,'adaptiveActivations':False,'perRunTrainingCapSeconds':a.seconds,'torch':torch.__version__,'numpy':np.__version__,'python':platform.python_version()},'x':grid.flatten().tolist(),'truth':truth.flatten().tolist(),'truthFlux':truthq.flatten().tolist(),'runs':{}}
    for seed in seeds:
        for kind in ['none','state','flux','full']:
            rr=run(kind,seed,a.k_right,a.steps,a.seconds,grid);result['runs'][f'{kind}-{seed}']=rr;print(json.dumps({k:rr[k] for k in ['kind','seed','steps','seconds','relativeL2','fluxError','stateJump','fluxJump','budgetLimited']}),flush=True);Path(a.output).write_text(json.dumps(result),encoding='utf-8')
if __name__=='__main__':main()
