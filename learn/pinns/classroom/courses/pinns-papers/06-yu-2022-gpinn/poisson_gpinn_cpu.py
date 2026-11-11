"""CPU adaptation of Yu et al. (2022), gPINN, original 1-D Poisson problem.
Original equation and hard endpoints; smaller network and explicit training cap.
"""
import argparse,json,math,platform,time
from pathlib import Path
import numpy as np
import torch
from torch import nn
class Field(nn.Sequential):
    def __init__(self,seed):
        torch.manual_seed(seed)
        super().__init__(nn.Linear(1,24),nn.Tanh(),nn.Linear(24,24),nn.Tanh(),nn.Linear(24,24),nn.Tanh(),nn.Linear(24,1))
        for l in self:
            if isinstance(l,nn.Linear):nn.init.xavier_normal_(l.weight);nn.init.zeros_(l.bias)
    def forward(self,x):return x+x*(math.pi-x)*super().forward(2*x/math.pi-1)
def exact(x):return x+sum(torch.sin(i*x)/i for i in range(1,5))+torch.sin(8*x)/8
def exact_dx(x):return 1+sum(torch.cos(i*x) for i in range(1,5))+torch.cos(8*x)
def source(x):return sum(i*torch.sin(i*x) for i in range(1,5))+8*torch.sin(8*x)
def derivatives(model,x,gradient=False):
    q=x.detach().clone().requires_grad_(True);u=model(q);ux=torch.autograd.grad(u,q,torch.ones_like(u),create_graph=True)[0];uxx=torch.autograd.grad(ux,q,torch.ones_like(ux),create_graph=True)[0];r=-uxx-source(q)
    rx=torch.autograd.grad(r,q,torch.ones_like(r),create_graph=True)[0] if gradient else torch.zeros_like(r)
    return u,ux,r,rx

def run(kind,seed,steps,seconds,x):
    n=32 if kind=='pinn32' else 16;weight=.01 if kind=='gpinn001' else 1. if kind=='gpinn1' else 0.;model=Field(seed);points=(torch.arange(n).reshape(-1,1)+.5)*math.pi/n
    opt=torch.optim.Adam(model.parameters(),lr=.001);truth=exact(x);truth_dx=exact_dx(x);frames=[];start=time.perf_counter();limited=False
    checksum=float(torch.cat([p.detach().flatten() for p in model.parameters()]).sum())
    def record(step):
        u,ux,r,rx=derivatives(model,x,True);_,_,rt,rxt=derivatives(model,points,True)
        frames.append({'step':step,'seconds':time.perf_counter()-start,'fieldError':float(((u-truth).norm()/truth.norm()).detach()),'derivativeError':float(((ux-truth_dx).norm()/truth_dx.norm()).detach()),'trainResidualMSE':float(rt.square().mean().detach()),'trainGradientMSE':float(rxt.square().mean().detach()),'curve':u.detach().flatten().tolist(),'slope':ux.detach().flatten().tolist()})
    record(0)
    for step in range(1,steps+1):
        if time.perf_counter()-start>seconds:limited=True;step-=1;break
        opt.zero_grad();_,_,r,rx=derivatives(model,points,weight>0);loss=r.square().mean()+weight*rx.square().mean();loss.backward();opt.step()
        if step%200==0:record(step)
    if frames[-1]['step']!=step:record(step)
    elapsed=time.perf_counter()-start;u,ux,r,rx=derivatives(model,x,True);hold=(torch.arange(257).reshape(-1,1)+.37)*math.pi/257;_,_,rh,rxh=derivatives(model,hold,True)
    with torch.no_grad():bc=model(torch.tensor([[0.],[math.pi]]))
    return {'kind':kind,'seed':seed,'points':n,'gradientWeight':weight,'parameters':sum(p.numel() for p in model.parameters()),'initialChecksum':checksum,'seconds':elapsed,'steps':step,'budgetLimited':limited,'fieldError':frames[-1]['fieldError'],'derivativeError':frames[-1]['derivativeError'],'heldoutResidualMSE':float(rh.square().mean().detach()),'heldoutGradientMSE':float(rxh.square().mean().detach()),'boundaryValues':bc.flatten().tolist(),'frames':frames,'field':u.detach().flatten().tolist(),'slope':ux.detach().flatten().tolist(),'residual':r.detach().flatten().tolist(),'residualGradient':rx.detach().flatten().tolist()}
def main():
    p=argparse.ArgumentParser();p.add_argument('--steps',type=int,default=4000);p.add_argument('--seconds',type=float,default=90);p.add_argument('--seeds',default='11,22,33');p.add_argument('--output',default=str(Path(__file__).with_name('trace.json')));a=p.parse_args()
    if not 1<=a.steps<=10000 or not 1<=a.seconds<=300:p.error('Use steps 1..10000 and seconds 1..300.')
    seeds=[int(s) for s in a.seeds.split(',')]
    if not 1<=len(seeds)<=5:p.error('Use one to five seeds.')
    torch.set_num_threads(4);torch.set_default_dtype(torch.float64);x=torch.linspace(0,math.pi,201).reshape(-1,1);u,ux,r,rx=derivatives(exact,x,True);assert float(r.abs().max().detach())<1e-11;assert float(rx.abs().max().detach())<1e-10;assert torch.allclose(ux,exact_dx(x),atol=1e-12)
    result={'paper':'https://arxiv.org/abs/2111.02801','scope':'Original 1-D Poisson equation and hard endpoint ansatz from section3.2.1; smaller network, point sets and update budget. No inverse problem or RAR is implemented in this episode.','config':{'layers':[1,24,24,24,1],'threads':4,'dtype':'float64','steps':a.steps,'seeds':seeds,'learningRate':.001,'pointCounts':[16,32],'gradientWeights':[0,.01,1.],'sameResidualAndGradientPoints':True,'hardBoundaryValues':True,'perRunTrainingCapSeconds':a.seconds,'torch':torch.__version__,'numpy':np.__version__,'python':platform.python_version()},'reference':{'method':'analytic x + sum(sin(i*x)/i,i=1..4) + sin(8x)/8','residualMax':float(r.abs().max().detach()),'residualGradientMax':float(rx.abs().max().detach())},'x':x.flatten().tolist(),'truth':u.detach().flatten().tolist(),'truthSlope':ux.detach().flatten().tolist(),'source':source(x).flatten().tolist(),'runs':{}}
    for seed in seeds:
        for kind in ['pinn16','pinn32','gpinn001','gpinn1']:
            r=run(kind,seed,a.steps,a.seconds,x);result['runs'][f'{kind}-{seed}']=r;print(json.dumps({k:r[k] for k in ['kind','seed','seconds','steps','fieldError','derivativeError','budgetLimited']}),flush=True);Path(a.output).write_text(json.dumps(result),encoding='utf-8')
if __name__=='__main__':main()
