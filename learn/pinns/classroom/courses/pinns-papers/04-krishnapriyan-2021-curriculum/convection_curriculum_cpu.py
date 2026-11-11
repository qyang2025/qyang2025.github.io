"""Small CPU adaptation of Krishnapriyan et al. (NeurIPS 2021), sections 3.1/5.1.
Periodic convection, paired direct and coefficient-continuation training.
"""
import argparse,json,math,platform,time
from pathlib import Path
import numpy as np
import torch
from torch import nn
class Field(nn.Sequential):
    def __init__(self,seed):
        torch.manual_seed(seed)
        super().__init__(nn.Linear(2,24),nn.Tanh(),nn.Linear(24,24),nn.Tanh(),nn.Linear(24,24),nn.Tanh(),nn.Linear(24,1))
        for layer in self:
            if isinstance(layer,nn.Linear):nn.init.xavier_normal_(layer.weight);nn.init.zeros_(layer.bias)
    def forward(self,q):return super().forward(torch.stack((q[:,0]/math.pi-1,2*q[:,1]-1),dim=1))
def exact(q,beta):return torch.sin(q[:,0:1]-beta*q[:,1:2])
def residual(model,q,beta):
    xy=q.detach().clone().requires_grad_(True);u=model(xy);du=torch.autograd.grad(u,xy,torch.ones_like(u),create_graph=True)[0]
    return du[:,1:2]+beta*du[:,0:1]
def losses(model,qr,q0,ql,qu,beta):
    lr=(residual(model,qr,beta)**2).mean();li=((model(q0)-torch.sin(q0[:,0:1]))**2).mean();lb=((model(ql)-model(qu))**2).mean()
    return lr,li,lb

def run(kind,seed,target,stage_steps,seconds,x,t,grid):
    model=Field(seed);rng=torch.Generator().manual_seed(71);qr=torch.rand((256,2),generator=rng);qr[:,0]*=2*math.pi
    xs=(torch.arange(48)+.5)*2*math.pi/48;q0=torch.stack((xs,torch.zeros_like(xs)),dim=1)
    ts=(torch.arange(32)+.5)/32;ql=torch.stack((torch.zeros_like(ts),ts),dim=1);qu=ql.clone();qu[:,0]=2*math.pi
    schedule=([1.,3.,6.,target] if kind in ['curriculum','curriculum-extra'] else [1.]*4 if kind=='easy' else [target]*4)
    goal=1. if kind=='easy' else target;truth=exact(grid,goal).reshape(len(t),len(x));frames=[];stages=[];start=time.perf_counter();limited=False;global_step=0
    checksum=float(torch.cat([p.detach().flatten() for p in model.parameters()]).sum())
    def record(beta,stage):
        with torch.no_grad():pred=model(grid).reshape(truth.shape);current_truth=exact(grid,beta).reshape(truth.shape)
        lr,li,lb=losses(model,qr,q0,ql,qu,beta)
        frames.append({'step':global_step,'stage':stage,'beta':beta,'seconds':time.perf_counter()-start,'residualMSE':float(lr.detach()),'initialMSE':float(li.detach()),'periodicMSE':float(lb.detach()),'targetRelativeL2':float((pred-truth).norm()/truth.norm()),'stageRelativeL2':float((pred-current_truth).norm()/current_truth.norm()),'curve':pred[-1].tolist()})
    record(schedule[0],0)
    for stage,beta in enumerate(schedule):
        before=float(torch.cat([p.detach().flatten() for p in model.parameters()]).sum());opt=torch.optim.Adam(model.parameters(),lr=.001)
        stages.append({'stage':stage,'beta':beta,'startStep':global_step,'startChecksum':before,'optimizerReset':True})
        for local_step in range(stage_steps*(4 if kind=='curriculum-extra' and stage==3 else 1)):
            if time.perf_counter()-start>seconds:limited=True;break
            opt.zero_grad();lr,li,lb=losses(model,qr,q0,ql,qu,beta);(lr+li+lb).backward();opt.step();global_step+=1
            if global_step%200==0:record(beta,stage)
        stages[-1]['endStep']=global_step;stages[-1]['endChecksum']=float(torch.cat([p.detach().flatten() for p in model.parameters()]).sum())
        if frames[-1]['step']!=global_step:record(beta,stage)
        if limited:break
    with torch.no_grad():field=model(grid).reshape(truth.shape)
    elapsed=time.perf_counter()-start
    h=torch.rand((512,2),generator=torch.Generator().manual_seed(97));h[:,0]*=2*math.pi
    heldout=float((residual(model,h,goal)**2).mean().detach())
    return {'kind':kind,'seed':seed,'parameters':sum(p.numel() for p in model.parameters()),'seconds':elapsed,'budgetLimited':limited,'steps':global_step,'targetBeta':goal,'schedule':schedule,'initialChecksum':checksum,'relativeL2':float((field-truth).norm()/truth.norm()),'maxAbsError':float((field-truth).abs().max()),'heldoutResidualMSE':heldout,'stages':stages,'frames':frames,'field':field.tolist()}

def main():
    p=argparse.ArgumentParser();p.add_argument('--stage-steps',type=int,default=1000);p.add_argument('--seconds',type=float,default=90);p.add_argument('--target-beta',type=float,default=10);p.add_argument('--seeds',default='11,22,33');p.add_argument('--modes',default='easy,direct,curriculum,curriculum-extra');p.add_argument('--append',action='store_true');p.add_argument('--output',default=str(Path(__file__).with_name('trace.json')));a=p.parse_args()
    if not 6<=a.target_beta<=20 or not 1<=a.stage_steps<=2500 or not 1<=a.seconds<=300:p.error('Use target beta 6..20, stage steps 1..2500 and seconds 1..300.')
    seeds=[int(s) for s in a.seeds.split(',')]
    if not 1<=len(seeds)<=5:p.error('Use one to five seeds.')
    torch.set_num_threads(4);torch.set_default_dtype(torch.float64)
    x=torch.linspace(0,2*math.pi,81);t=torch.linspace(0,1,21);tt,xx=torch.meshgrid(t,x,indexing='ij');grid=torch.stack((xx.flatten(),tt.flatten()),dim=1)
    check=residual(lambda q:exact(q,a.target_beta),grid,a.target_beta);assert float(check.abs().max().detach())<1e-12
    result={'paper':'https://arxiv.org/abs/2109.01050','scope':'Small 1-D convection method adaptation, not published benchmark reproduction. Coefficient continuation, not time-window sequence-to-sequence training.','config':{'targetBeta':a.target_beta,'layers':[2,24,24,24,1],'collocationPoints':256,'initialPoints':48,'periodicPairs':32,'threads':4,'dtype':'float64','stageSteps':a.stage_steps,'totalSteps':4*a.stage_steps,'seeds':seeds,'learningRate':.001,'trainingSeed':71,'heldoutSeed':97,'perRunTrainingCapSeconds':a.seconds,'optimizerResetAtStageBoundaries':True,'torch':torch.__version__,'numpy':np.__version__,'python':platform.python_version()},'reference':{'method':'analytic sin(x-beta*t)','maxPDEResidual':float(check.abs().max().detach())},'x':x.tolist(),'times':t.tolist(),'truth':exact(grid,a.target_beta).reshape(len(t),len(x)).tolist(),'easyTruth':exact(grid,1).reshape(len(t),len(x)).tolist(),'runs':{}}
    if a.append:
        previous=json.loads(Path(a.output).read_text(encoding='utf-8'))
        assert previous['config']['targetBeta']==a.target_beta and previous['config']['stageSteps']==a.stage_steps
        result['runs']=previous['runs']
    result['config']['extraBudgetDiagnostic']={'warmupSteps':3*a.stage_steps,'targetSteps':4*a.stage_steps,'totalSteps':7*a.stage_steps,'sameBudget':False}
    modes=a.modes.split(',')
    if any(k not in ['easy','direct','curriculum','curriculum-extra'] for k in modes):p.error('Unknown mode')
    for seed in seeds:
        for kind in modes:
            r=run(kind,seed,a.target_beta,a.stage_steps,a.seconds,x,t,grid);result['runs'][f'{kind}-{seed}']=r
            print(json.dumps({k:r[k] for k in ['kind','seed','seconds','relativeL2','heldoutResidualMSE','budgetLimited']}),flush=True);Path(a.output).write_text(json.dumps(result),encoding='utf-8')
if __name__=='__main__':main()
