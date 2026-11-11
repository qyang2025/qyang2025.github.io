"""CPU teaching adaptation of Wu et al. (2023), section 2.3.2 RAD.
Stationary 1-D advection-diffusion boundary layer, not a paper benchmark.
"""
import argparse,json,platform,time
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
    def forward(self,x):return x+x*(1-x)*super().forward(2*x-1)
def exact(x,nu):return (torch.exp((x-1)/nu)-np.exp(-1/nu))/(1-np.exp(-1/nu))
def exact_dx(x,nu):return torch.exp((x-1)/nu)/(nu*(1-np.exp(-1/nu)))
def fields(model,x,nu):
    q=x.detach().clone().requires_grad_(True);u=model(q);ux=torch.autograd.grad(u,q,torch.ones_like(u),create_graph=True)[0];uxx=torch.autograd.grad(ux,q,torch.ones_like(ux),create_graph=True)[0]
    return u,ux,ux-nu*uxx

def rad_probabilities(residual,k=1.,c=1.):
    power=residual.detach().flatten().abs().pow(k);mean=power.mean()
    score=power/mean.clamp_min(1e-14)+c
    if float(score.sum())<=0:return torch.ones_like(score)/len(score)
    return score/score.sum()

def run(kind,seed,nu,steps,seconds,grid):
    model=Field(seed);pool=(torch.arange(512).reshape(-1,1)+.5)/512;gen=torch.Generator().manual_seed(100+seed);uniform=torch.ones(512)/512
    initial_indices=torch.multinomial(uniform,32,replacement=False,generator=gen);points=(torch.arange(32).reshape(-1,1)+.5)/32 if kind=='grid' else pool[initial_indices]
    initial_points=points.flatten().tolist();checksum=float(torch.cat([p.detach().flatten() for p in model.parameters()]).sum());opt=torch.optim.Adam(model.parameters(),lr=.001);truth=exact(grid,nu);truth_dx=exact_dx(grid,nu)
    frames=[];events=[];limited=False;search_seconds=0.;candidate_evals=0;start=time.perf_counter()
    def record(step):
        u,ux,r=fields(model,grid,nu);_,_,rt=fields(model,points,nu)
        frames.append({'step':step,'seconds':time.perf_counter()-start,'relativeL2':float(((u-truth).norm()/truth.norm()).detach()),'derivativeError':float(((ux-truth_dx).norm()/truth_dx.norm()).detach()),'trainResidualMSE':float(rt.square().mean().detach()),'curve':u.detach().flatten().tolist(),'points':points.flatten().tolist(),'layerPoints':int((points>.9).sum())})
    record(0)
    for step in range(1,steps+1):
        if time.perf_counter()-start>seconds:limited=True;step-=1;break
        if kind in ['resample','rad'] and step>1 and (step-1)%500==0:
            before=time.perf_counter();prob=uniform;profile=[]
            if kind=='rad':
                _,_,rp=fields(model,pool,nu);prob=rad_probabilities(rp);profile=rp.detach().flatten().tolist();candidate_evals+=512
            indices=torch.multinomial(prob,32,replacement=False,generator=gen);points=pool[indices]
            elapsed=time.perf_counter()-before;search_seconds+=elapsed
            events.append({'step':step-1,'indices':indices.tolist(),'points':points.flatten().tolist(),'probabilities':prob.tolist(),'candidateResiduals':profile,'layerPoints':int((points>.9).sum()),'searchSeconds':elapsed})
        opt.zero_grad();_,_,r=fields(model,points,nu);r.square().mean().backward();opt.step()
        if step%200==0:record(step)
    if frames[-1]['step']!=step:record(step)
    elapsed=time.perf_counter()-start;u,ux,r=fields(model,grid,nu);held=(torch.arange(257).reshape(-1,1)+.37)/257;_,_,rh=fields(model,held,nu)
    with torch.no_grad():boundary=model(torch.tensor([[0.],[1.]]))
    return {'kind':kind,'seed':seed,'parameters':sum(p.numel() for p in model.parameters()),'seconds':elapsed,'steps':step,'budgetLimited':limited,'initialChecksum':checksum,'initialPoints':initial_points,'relativeL2':frames[-1]['relativeL2'],'derivativeError':frames[-1]['derivativeError'],'heldoutResidualMSE':float(rh.square().mean().detach()),'maxAbsError':float((u-exact(grid,nu)).abs().max().detach()),'boundaryValues':boundary.flatten().tolist(),'searchSeconds':search_seconds,'candidateEvaluations':candidate_evals,'resamplingEvents':events,'frames':frames,'field':u.detach().flatten().tolist(),'slope':ux.detach().flatten().tolist(),'residual':r.detach().flatten().tolist()}
def main():
    p=argparse.ArgumentParser();p.add_argument('--nu',type=float,default=.05);p.add_argument('--steps',type=int,default=4000);p.add_argument('--seconds',type=float,default=90);p.add_argument('--seeds',default='11,22,33');p.add_argument('--output',default=str(Path(__file__).with_name('trace.json')));a=p.parse_args()
    if not .02<=a.nu<=.2 or not 1<=a.steps<=10000 or not 1<=a.seconds<=300:p.error('Use nu .02..2e-1, steps1..10000, seconds1..300.')
    seeds=[int(s) for s in a.seeds.split(',')]
    if not 1<=len(seeds)<=5:p.error('Use one to five seeds.')
    torch.set_num_threads(4);torch.set_default_dtype(torch.float64);grid=torch.linspace(0,1,501).reshape(-1,1);u,ux,r=fields(lambda x:exact(x,a.nu),grid,a.nu);assert float(r.abs().max().detach())<1e-10
    result={'paper':'https://arxiv.org/abs/2207.10289','scope':'Independent stationary advection-diffusion adaptation for RAD, not the original six PDE benchmark study. Fixed32 training points; fixed512 candidate pool; no RAR-G/RAR-D, gPINN or inverse problem.','config':{'nu':a.nu,'layers':[1,24,24,24,1],'threads':4,'dtype':'float64','steps':a.steps,'seeds':seeds,'learningRate':.001,'trainingPoints':32,'candidatePoints':512,'resampleEvery':500,'radK':1.,'radC':1.,'samplingWithoutReplacement':True,'candidatePoolFixed':True,'samplingSeedOffset':100,'hardBoundaryValues':True,'importanceCorrection':False,'perRunTrainingCapSeconds':a.seconds,'torch':torch.__version__,'numpy':np.__version__,'python':platform.python_version()},'reference':{'method':'stable analytic exponential boundary layer','maxResidual':float(r.abs().max().detach())},'x':grid.flatten().tolist(),'truth':u.detach().flatten().tolist(),'truthSlope':ux.detach().flatten().tolist(),'candidates':((torch.arange(512)+.5)/512).tolist(),'runs':{}}
    for seed in seeds:
        for kind in ['grid','random','resample','rad']:
            rr=run(kind,seed,a.nu,a.steps,a.seconds,grid);result['runs'][f'{kind}-{seed}']=rr;print(json.dumps({k:rr[k] for k in ['kind','seed','seconds','steps','relativeL2','derivativeError','candidateEvaluations','budgetLimited']}),flush=True);Path(a.output).write_text(json.dumps(result),encoding='utf-8')
if __name__=='__main__':main()
