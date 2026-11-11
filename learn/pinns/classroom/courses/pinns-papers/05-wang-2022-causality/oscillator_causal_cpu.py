"""Small oscillator adaptation of causal residual weighting (Wang et al. 2022).
Hard initial values, ordered temporal bins, detached prefix-sum weights. Not a chaotic benchmark reproduction.
"""
import argparse,json,math,platform,time
from pathlib import Path
import numpy as np
import torch
from torch import nn
class Oscillator(nn.Module):
    def __init__(self,seed):
        super().__init__();torch.manual_seed(seed)
        self.net=nn.Sequential(nn.Linear(1,24),nn.Tanh(),nn.Linear(24,24),nn.Tanh(),nn.Linear(24,24),nn.Tanh(),nn.Linear(24,2))
        for l in self.net:
            if isinstance(l,nn.Linear):nn.init.xavier_normal_(l.weight);nn.init.zeros_(l.bias)
    def forward(self,t):return torch.cat((torch.ones_like(t),torch.zeros_like(t)),dim=1)+t*self.net(2*t-1)
def exact(t,omega):return torch.cat((torch.cos(omega*t),-torch.sin(omega*t)),dim=1)
def residual(model,t,omega):
    q=t.detach().clone().requires_grad_(True);uv=model(q)
    ut=torch.autograd.grad(uv[:,0:1],q,torch.ones_like(q),create_graph=True)[0]
    vt=torch.autograd.grad(uv[:,1:2],q,torch.ones_like(q),create_graph=True)[0]
    return torch.cat((ut-omega*uv[:,1:2],vt+omega*uv[:,0:1]),dim=1)
def temporal_losses(model,points,omega):return residual(model,points,omega).reshape(8,8,2).square().mean(dim=(1,2))
def temporal_weights(losses,epsilon):
    previous=torch.cat((torch.zeros(1),torch.cumsum(losses.detach(),dim=0)[:-1]))
    return torch.exp(-epsilon*previous).detach()
def run(mode,seed,omega,steps,seconds,grid):
    model=Oscillator(seed);points=(torch.arange(64).reshape(-1,1)+.5)/64;truth=exact(grid,omega);opt=torch.optim.Adam(model.parameters(),lr=.001)
    epsilons=[.01,.1,1.,10.,100.];stage=0;eps=0. if mode=='uniform' else 1. if mode=='fixed' else epsilons[0];frames=[];events=[];stage_start=0;criterion_at=None;limited=False;start=time.perf_counter()
    checksum=float(torch.cat([p.detach().flatten() for p in model.parameters()]).sum())
    def record(step):
        losses=temporal_losses(model,points,omega);weights=temporal_weights(losses,eps)
        with torch.no_grad():field=model(grid);e=float((field-truth).norm()/truth.norm());energy=field.square().sum(dim=1)
        frames.append({'step':step,'seconds':time.perf_counter()-start,'epsilon':eps,'losses':losses.detach().tolist(),'weights':weights.tolist(),'weightedLoss':float((weights*losses).mean().detach()),'unweightedLoss':float(losses.mean().detach()),'relativeL2':e,'energyMaxError':float((energy-1).abs().max()),'curve':field[:,0].tolist(),'velocity':field[:,1].tolist()})
    record(0)
    for step in range(1,steps+1):
        if time.perf_counter()-start>seconds:limited=True;step-=1;break
        losses=temporal_losses(model,points,omega);weights=temporal_weights(losses,eps)
        if mode=='annealed' and step-stage_start>=200 and step%100==0 and float(weights.min())>.99:
            if stage<len(epsilons)-1:
                events.append({'step':step,'from':eps,'to':epsilons[stage+1],'minimumWeight':float(weights.min())});stage+=1;eps=epsilons[stage];stage_start=step;weights=temporal_weights(losses,eps)
            elif criterion_at is None:criterion_at=step
        opt.zero_grad();(weights*losses).mean().backward();opt.step()
        if step%200==0:record(step)
    if frames[-1]['step']!=step:record(step)
    elapsed=time.perf_counter()-start
    with torch.no_grad():field=model(grid);initial=model(torch.zeros((1,1)))
    hold=(torch.arange(128).reshape(-1,1)+.37)/128;heldout=float(residual(model,hold,omega).square().mean().detach())
    return {'kind':mode,'seed':seed,'parameters':sum(p.numel() for p in model.parameters()),'seconds':elapsed,'steps':step,'budgetLimited':limited,'relativeL2':float((field-truth).norm()/truth.norm()),'heldoutResidualMSE':heldout,'initialValues':initial.flatten().tolist(),'energyMaxError':float((field.square().sum(dim=1)-1).abs().max()),'finalEpsilon':eps,'finalMinimumWeight':min(frames[-1]['weights']),'finalCriterionMetAt':criterion_at,'initialChecksum':checksum,'epsilonEvents':events,'frames':frames,'field':field.tolist()}
def main():
    p=argparse.ArgumentParser();p.add_argument('--steps',type=int,default=6000);p.add_argument('--seconds',type=float,default=90);p.add_argument('--omega',type=float,default=6.);p.add_argument('--seeds',default='11,22,33');p.add_argument('--output',default=str(Path(__file__).with_name('trace.json')));a=p.parse_args()
    if not 1<=a.steps<=10000 or not 1<=a.seconds<=300 or not 1<=a.omega<=12:p.error('Use steps 1..10000, seconds 1..300, omega 1..12.')
    seeds=[int(s) for s in a.seeds.split(',')]
    if not 1<=len(seeds)<=5:p.error('Use one to five seeds.')
    torch.set_num_threads(4);torch.set_default_dtype(torch.float64);grid=torch.linspace(0,1,201).reshape(-1,1);truth=exact(grid,a.omega)
    ref_residual=float(residual(lambda q:exact(q,a.omega),grid,a.omega).abs().max().detach());assert ref_residual<1e-12
    result={'paper':'https://arxiv.org/abs/2203.07404','scope':'Independent harmonic-oscillator ODE adaptation of causal temporal residual weighting, not original chaotic/turbulent benchmarks. Exact initial-value ansatz; fixed total-step budget; no time-window marching.','config':{'omega':a.omega,'layers':[1,24,24,24,2],'collocationPoints':64,'timeBins':8,'pointsPerBin':8,'threads':4,'dtype':'float64','steps':a.steps,'seeds':seeds,'learningRate':.001,'fixedEpsilon':1.,'epsilonSchedule':[.01,.1,1.,10.,100.],'criterion':.99,'minimumUpdatesPerEpsilon':200,'criterionCheckEvery':100,'stopAtCriterion':False,'hardInitialCondition':True,'detachedWeights':True,'perRunTrainingCapSeconds':a.seconds,'torch':torch.__version__,'numpy':np.__version__,'python':platform.python_version()},'reference':{'method':'analytic cos(omega*t), -sin(omega*t)','maxResidual':ref_residual,'energy':1.},'times':grid.flatten().tolist(),'truth':truth.tolist(),'runs':{}}
    for seed in seeds:
        for mode in ['uniform','fixed','annealed']:
            r=run(mode,seed,a.omega,a.steps,a.seconds,grid);result['runs'][f'{mode}-{seed}']=r
            print(json.dumps({k:r[k] for k in ['kind','seed','seconds','relativeL2','heldoutResidualMSE','finalEpsilon','finalMinimumWeight','budgetLimited']}),flush=True);Path(a.output).write_text(json.dumps(result),encoding='utf-8')
if __name__=='__main__':main()
