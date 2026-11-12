"""Small disk adaptation of Sukumar & Srivastava, arXiv:2104.08426v2.
Equation7 circular ADF and section5 Dirichlet lift; not all paper benchmarks.
"""
import argparse,json,platform,time
from pathlib import Path
import numpy as np
import torch
from torch import nn

def lift(x):return .2*x[:,0:1]
def phi(x):return (1-x.square().sum(1,keepdim=True))/2
def distance(x):return 1-x.square().sum(1,keepdim=True).sqrt()
def exact(x):return lift(x)+1-x.square().sum(1,keepdim=True)
def disk_points(n,offset=0):
    i=torch.arange(n);r=((i+.5)/n).sqrt();a=i*(np.pi*(3-np.sqrt(5)))+offset
    return torch.stack([r*torch.cos(a),r*torch.sin(a)],dim=1)
def circle_points(n,offset=0):
    a=2*torch.pi*(torch.arange(n)+offset)/n
    return torch.stack([torch.cos(a),torch.sin(a)],dim=1)
class Plate(nn.Module):
    def __init__(self,seed):
        super().__init__();torch.manual_seed(seed)
        self.net=nn.Sequential(nn.Linear(2,16),nn.Tanh(),nn.Linear(16,16),nn.Tanh(),nn.Linear(16,1))
        for layer in self.net:
            if isinstance(layer,nn.Linear):nn.init.xavier_normal_(layer.weight);nn.init.zeros_(layer.bias)
    def forward(self,x,kind):
        factor=phi(x) if kind=='hard' else distance(x) if kind=='distance' else 1
        return lift(x)+factor*self.net(x)
def residual(model,x,kind):
    q=x.detach().clone().requires_grad_(True);u=model(q,kind);du=torch.autograd.grad(u,q,torch.ones_like(u),create_graph=True)[0]
    xx=torch.autograd.grad(du[:,0:1],q,torch.ones_like(du[:,0:1]),create_graph=True)[0][:,0:1]
    yy=torch.autograd.grad(du[:,1:2],q,torch.ones_like(du[:,1:2]),create_graph=True)[0][:,1:2]
    return -xx-yy-4
def run(kind,seed,steps,cap,grid,line):
    model=Plate(seed);params=list(model.parameters());checksum=float(torch.cat([p.detach().flatten() for p in params]).sum());opt=torch.optim.Adam(params,lr=.002)
    points=disk_points(128);edge=circle_points(64);audit_edge=circle_points(257,.37);held=disk_points(257,.73);reference=exact(grid);weight=1 if kind=='soft1' else 100 if kind=='soft100' else 0
    frames=[];start=time.perf_counter();limited=False
    def record(step):
        with torch.no_grad():
            u=model(grid,kind);b=model(audit_edge,kind)-lift(audit_edge);curve=model(line,kind)
            frames.append({'step':step,'seconds':time.perf_counter()-start,'relativeL2':float((u-reference).norm()/reference.norm()),'boundaryMax':float(b.abs().max()),'boundaryRMS':float(b.square().mean().sqrt()),'curve':curve.flatten().tolist()})
    record(0)
    for step in range(1,steps+1):
        if time.perf_counter()-start>cap:limited=True;step-=1;break
        opt.zero_grad();lr=residual(model,points,kind).square().mean();lb=(model(edge,kind)-lift(edge)).square().mean();loss=lr+weight*lb;loss.backward();opt.step()
        if step%200==0:record(step)
    if frames[-1]['step']!=step:record(step)
    elapsed=time.perf_counter()-start;rh=residual(model,held,kind);centre=residual(model,torch.zeros(1,2),kind).detach();finite=bool(torch.isfinite(centre).all())
    with torch.no_grad():field=model(grid,kind).flatten().tolist();bv=(model(audit_edge,kind)-lift(audit_edge)).flatten().tolist()
    return {'kind':kind,'seed':seed,'parameters':sum(p.numel() for p in params),'steps':step,'seconds':elapsed,'budgetLimited':limited,'initialChecksum':checksum,'boundaryWeight':weight,'relativeL2':frames[-1]['relativeL2'],'boundaryMax':frames[-1]['boundaryMax'],'boundaryRMS':frames[-1]['boundaryRMS'],'heldoutResidualRMS':float(rh.square().mean().sqrt().detach()),'centreResidualFinite':finite,'centreResidual':float(centre.item()) if finite else None,'field':field,'boundaryErrors':bv,'frames':frames}
def main():
    p=argparse.ArgumentParser();p.add_argument('--steps',type=int,default=2000);p.add_argument('--seconds',type=float,default=90);p.add_argument('--seeds',default='11,22,33');p.add_argument('--output',default=str(Path(__file__).with_name('trace.json')));a=p.parse_args()
    if not 1<=a.steps<=10000 or not 1<=a.seconds<=300:p.error('Use steps1..10000 and seconds1..300')
    seeds=[int(s) for s in a.seeds.split(',')]
    if Path(a.output).resolve()==Path(__file__).with_name('trace.json').resolve() and (a.steps!=2000 or a.seconds!=90 or seeds!=[11,22,33]):p.error('Save exploratory settings with --output a-new-file.json')
    if not 1<=len(seeds)<=5:p.error('Use one to five seeds')
    torch.set_num_threads(4);torch.set_default_dtype(torch.float64)
    axis=torch.linspace(-1,1,31);xx,yy=torch.meshgrid(axis,axis,indexing='xy');all_points=torch.stack([xx.flatten(),yy.flatten()],dim=1);grid=all_points[all_points.square().sum(1)<=1+1e-12]
    x=torch.linspace(-1,1,301);line=torch.stack([x,torch.zeros_like(x)],dim=1)
    record={'paper':'https://arxiv.org/abs/2104.08426v2','scope':'Independent unit-disk Poisson/Dirichlet teaching adaptation using circular ADF equation7 and a known nonzero lift;not original multidomain,R-function assembly,Neumann,Robin,biharmonic or4D benchmarks. Raw exact-distance control is intentionally non-C1 at centre and cannot define a classical strong residual there.','config':{'layers':[2,16,16,1],'threads':4,'dtype':'float64','learningRate':.002,'steps':a.steps,'seeds':seeds,'interiorPoints':128,'boundaryPoints':64,'auditBoundaryPoints':257,'auditResidualPoints':257,'centreIncludedInTraining':False,'source':4,'boundaryLiftCoefficient':.2,'radius':1,'perRunTrainingCapSeconds':a.seconds,'pairedWeightsNotIdenticalInitialFunctions':True,'torch':torch.__version__,'numpy':np.__version__,'python':platform.python_version()},'points':grid.tolist(),'truthField':exact(grid).flatten().tolist(),'x':x.tolist(),'truth':exact(line).flatten().tolist(),'trainingPoints':disk_points(128).tolist(),'boundaryPoints':circle_points(64).tolist(),'auditBoundaryPoints':circle_points(257,.37).tolist(),'runs':{}}
    out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True)
    for seed in seeds:
        for kind in ['soft1','soft100','hard','distance']:
            r=run(kind,seed,a.steps,a.seconds,grid,line);record['runs'][f'{kind}-{seed}']=r
            print(json.dumps({k:r[k] for k in ['kind','seed','steps','seconds','relativeL2','boundaryMax','heldoutResidualRMS','centreResidualFinite','budgetLimited']}),flush=True)
            out.write_text(json.dumps(record,allow_nan=False),encoding='utf-8')
if __name__=='__main__':main()
