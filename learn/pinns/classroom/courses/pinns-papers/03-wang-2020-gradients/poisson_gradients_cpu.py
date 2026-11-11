"""CPU teaching adaptation of Wang, Teng & Perdikaris (2020), sections 2.3/2.5.
A fixed 1-D Poisson problem; not the paper's 2-D benchmark or improved architecture.
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
        for layer in self:
            if isinstance(layer,nn.Linear):nn.init.xavier_normal_(layer.weight);nn.init.zeros_(layer.bias)
    def forward(self,x):return super().forward(2*x-1)

def source(x,c):return -c*c*torch.sin(c*x)
def exact(x,c):return torch.sin(c*x)
def curvature(model,x):
    q=x.detach().clone().requires_grad_(True);u=model(q)
    ux=torch.autograd.grad(u,q,torch.ones_like(u),create_graph=True)[0]
    uxx=torch.autograd.grad(ux,q,torch.ones_like(ux),create_graph=True)[0]
    return uxx

def losses(model,xr,xb,c):
    lr=((curvature(model,xr)-source(xr,c))**2).mean()
    lb=((model(xb)-exact(xb,c))**2).mean()
    return lr,lb

def gradients(loss,params):
    values=torch.autograd.grad(loss,params,retain_graph=True,allow_unused=True)
    return torch.cat([(torch.zeros_like(p) if g is None else g).flatten() for p,g in zip(params,values)]).detach()

def statistics(lr,lb,params,w):
    gr,gb=gradients(lr,params),gradients(lb,params)
    nr,nb=float(gr.norm()),float(gb.norm())
    return {'residualMax':float(gr.abs().max()),'boundaryMean':float(gb.abs().mean()),'residualNorm':nr,'boundaryNorm':nb,'weightedBoundaryNorm':w*nb,'cosine':float(torch.dot(gr,gb)/(gr.norm()*gb.norm()).clamp_min(1e-30))}

def run(kind,seed,c,steps,seconds):
    model=Field(seed);params=list(model.parameters());xr=(torch.arange(64).reshape(-1,1)+.5)/64;xb=torch.tensor([[0.],[1.]])
    xv=torch.linspace(0,1,201).reshape(-1,1);truth=exact(xv,c);w=100. if kind=='fixed100' else 1.
    initial=[p.detach().clone() for p in params];opt=torch.optim.Adam(params,lr=.001);frames=[];updates=[];limited=False;clips=0;start=time.perf_counter()
    def record(step):
        lr,lb=losses(model,xr,xb,c);stats=statistics(lr,lb,params,w)
        with torch.no_grad():pred=model(xv);bc=model(xb);error=float((pred-truth).norm()/truth.norm())
        frames.append({'step':step,'seconds':time.perf_counter()-start,'weight':w,'residualMSE':float(lr.detach()),'boundaryMSE':float(lb.detach()),'objective':float(lr.detach())+w*float(lb.detach()),'relativeL2':error,'boundaryValues':bc.flatten().tolist(),'curve':pred.flatten().tolist(),**stats})
    record(0)
    for step in range(1,steps+1):
        if time.perf_counter()-start>=seconds:limited=True;step-=1;break
        lr,lb=losses(model,xr,xb,c)
        if kind in ['adaptive','guarded'] and (step-1)%10==0:
            stats=statistics(lr,lb,params,w);proposal=stats['residualMax']/max(stats['boundaryMean'],1e-12);bounded=min(100. if kind=='guarded' else 1e6,max(1. if kind=='guarded' else 1e-6,proposal));clips+=int(bounded!=proposal)
            old=w;alpha=.1 if kind=='guarded' else .9;w=(1-alpha)*w+alpha*bounded
            updates.append({'step':step,'previous':old,'proposal':proposal,'bounded':bounded,'weight':w,'residualMax':stats['residualMax'],'boundaryMean':stats['boundaryMean']})
        opt.zero_grad();objective=lr+w*lb;objective.backward();opt.step()
        if step%200==0:record(step)
    if frames[-1]['step']!=step:record(step)
    elapsed=time.perf_counter()-start
    xh=(torch.arange(128).reshape(-1,1)+.37)/128
    residual=curvature(model,xh)-source(xh,c)
    final=frames[-1]
    return {'kind':kind,'seed':seed,'parameters':sum(p.numel() for p in params),'seconds':elapsed,'budgetLimited':limited,'steps':step,'relativeL2':final['relativeL2'],'boundaryMSE':final['boundaryMSE'],'heldoutResidualMSE':float((residual**2).mean().detach()),'weight':w,'weightClipCount':clips,'frames':frames,'weightUpdates':updates,'initialParameterChecksum':float(torch.cat([p.flatten() for p in initial]).sum())}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--steps',type=int,default=4000);parser.add_argument('--seconds',type=float,default=90);parser.add_argument('--frequency',type=float,default=4.);parser.add_argument('--seeds',default='11,22,33');parser.add_argument('--modes',default='unweighted,fixed100,adaptive,guarded');parser.add_argument('--append',action='store_true');parser.add_argument('--output',default=str(Path(__file__).with_name('trace.json')));a=parser.parse_args()
    if not 1<=a.steps<=10000 or not 1<=a.seconds<=300 or not .1<=a.frequency<=12:parser.error('Use steps 1..10000, seconds 1..300 and frequency 0.1..12.')
    seeds=[int(s) for s in a.seeds.split(',')]
    if not 1<=len(seeds)<=5:parser.error('Use 1..5 seeds.')
    torch.set_default_dtype(torch.float64);torch.set_num_threads(4)
    x=torch.linspace(0,1,201).reshape(-1,1);c=a.frequency
    # Independent derivative check fixes residual sign and endpoint semantics.
    analyticResidual=curvature(lambda q:exact(q,c),x)-source(x,c)
    assert float(analyticResidual.abs().max().detach())<1e-10
    result={'paper':'https://arxiv.org/abs/2001.04536','scope':'1-D Poisson teaching adaptation, sections 2.3 and 2.5. No claim to reproduce 2-D benchmarks or gated architecture.','config':{'frequency':c,'layers':[1,24,24,24,1],'collocationPoints':64,'boundaryPoints':2,'threads':4,'dtype':'float64','steps':a.steps,'seeds':seeds,'learningRate':.001,'alpha':.9,'weightUpdateEvery':10,'weightEpsilon':1e-12,'weightBounds':[1e-6,1e6],'gradientCoordinates':'all trainable scalars including zero residual gradients','perRunTrainingCapSeconds':a.seconds,'torch':torch.__version__,'numpy':np.__version__,'python':platform.python_version()},'reference':{'method':'analytic sin(C*x)','maxPDEResidual':float(analyticResidual.abs().max().detach()),'boundary':[0.,math.sin(c)]},'x':x.flatten().tolist(),'truth':exact(x,c).flatten().tolist(),'source':source(x,c).flatten().tolist(),'runs':{}}
    if a.append:
        previous=json.loads(Path(a.output).read_text(encoding='utf-8'))
        assert previous['config']['frequency']==c and previous['config']['steps']==a.steps
        result['runs']=previous['runs']
    result['config']['guardedVariant']={'alpha':.1,'bounds':[1.,100.],'status':'explicit engineering modification, not Algorithm 1 unchanged'}
    modes=a.modes.split(',')
    if any(k not in ['unweighted','fixed100','adaptive','guarded'] for k in modes):parser.error('Unknown mode')
    for seed in seeds:
        for kind in modes:
            r=run(kind,seed,c,a.steps,a.seconds);result['runs'][f'{kind}-{seed}']=r
            print(json.dumps({k:r[k] for k in ['kind','seed','seconds','relativeL2','boundaryMSE','heldoutResidualMSE','weight','weightClipCount','budgetLimited']}),flush=True)
            Path(a.output).write_text(json.dumps(result),encoding='utf-8')
if __name__=='__main__':main()
