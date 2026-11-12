"""Small independent adaptation of Kharazmi et al., arXiv:1912.00873v1.
Legendre test functions and once-integrated residual; not original benchmarks.
"""
import argparse, json, platform, time
from pathlib import Path
import numpy as np
import torch
from torch import nn

def exact(x): return 1-x*x+.2*torch.sin(torch.pi*x)
def forcing(x): return 2+.2*torch.pi**2*torch.sin(torch.pi*x)
def exact_flux(x): return 2*x-.2*torch.pi*torch.cos(torch.pi*x)

def tests(x, count):
    """v_k=P_(k+1)-P_(k-1), v'_k=(2k+1)P_k; no normalisation."""
    xx=x.detach().numpy().reshape(-1)
    ps=np.polynomial.legendre.legvander(xx,count+1)
    v=np.stack([ps[:,k+1]-ps[:,k-1] for k in range(1,count+1)],axis=1)
    dv=np.stack([(2*k+1)*ps[:,k] for k in range(1,count+1)],axis=1)
    ddv=np.stack([np.polynomial.legendre.legval(xx,np.polynomial.legendre.legder(np.eye(count+2)[k]))*(2*k+1) for k in range(1,count+1)],axis=1)
    return tuple(torch.as_tensor(a) for a in (v,dv,ddv))

def gauss(q):
    x,w=np.polynomial.legendre.leggauss(q)
    return torch.tensor(x).reshape(-1,1),torch.tensor(w).reshape(-1,1)

def diagnostics(grid):
    nodes={}
    for q in [4,32]:
        x,w=gauss(q);nodes[str(q)]={'x':x.flatten().tolist(),'weights':w.flatten().tolist()}
    x,w=gauss(128);v,dv,_=tests(x,8)
    # P3-P1 has derivative5*P2, invisible to v1'=3*P1 but not to v2'.
    p=np.polynomial.legendre.legvander(x.numpy().reshape(-1),3)
    derivative=torch.tensor(5*p[:,2]).reshape(-1,1)
    null_moments=(w*derivative*dv).sum(dim=0).tolist()
    xx=grid.flatten().tolist();null_curve=[2.5*(z**3-z) for z in xx]
    qx,qw=gauss(4);qv,qdv,_=tests(qx,8);A=(qw*qdv).numpy().T;b=(qw*forcing(qx)*qv).sum(dim=0).numpy();d=np.linalg.lstsq(A,b,rcond=None)[0]
    return {'quadratureNodes':nodes,'blindExample':{'w':null_curve,'moments':null_moments,'amplitude':.3},'underintegration':{'matrixRank':int(np.linalg.matrix_rank(A)),'lossLowerBound':float(np.mean((A@d-b)**2)),'fourthSourceMoment':float(b[3]),'maxFourthTestSlopeAtNodes':float(qdv[:,3].abs().max())},'quadraturePolynomialCheck':{'integrand':'x^8','exact':2/9,'q4':float((gauss(4)[1]*gauss(4)[0]**8).sum()),'q8':float((gauss(8)[1]*gauss(8)[0]**8).sum())}}

class Rod(nn.Module):
    def __init__(self,seed):
        super().__init__();torch.manual_seed(seed)
        self.net=nn.Sequential(nn.Linear(1,16),nn.Tanh(),nn.Linear(16,16),nn.Tanh(),nn.Linear(16,1))
        for m in self.net:
            if isinstance(m,nn.Linear):nn.init.xavier_normal_(m.weight);nn.init.zeros_(m.bias)
    def forward(self,x): return (1-x*x)*self.net(x)

def fields(model,x,second=True):
    xx=x.detach().clone().requires_grad_(True);u=model(xx)
    ux=torch.autograd.grad(u,xx,torch.ones_like(u),create_graph=True)[0]
    r=None
    if second:r=-torch.autograd.grad(ux,xx,torch.ones_like(ux),create_graph=True)[0]-forcing(xx)
    return u,ux,r

def moments(model,x,w,k):
    u,ux,_=fields(model,x,False);v,dv,_=tests(x,k)
    return ((w*ux)*dv-w*forcing(x)*v).sum(dim=0)

def run(kind,seed,steps,seconds,grid,custom_k=None,custom_q=None):
    model=Rod(seed);params=list(model.parameters());checksum=float(torch.cat([p.detach().flatten() for p in params]).sum())
    q=custom_q if custom_q is not None else 4 if kind=='weak-q4' else 32;k=custom_k if custom_k is not None else 1 if kind=='weak-k1' else 8
    gx,gw=gauss(q);v,dv,_=tests(gx,k);load=(gw*forcing(gx)*v).sum(dim=0)
    collocation=-1+2*(torch.arange(32).reshape(-1,1)+.5)/32
    ax,aw=gauss(128);av,adv,addv=tests(ax,16);held=-1+2*(torch.arange(257).reshape(-1,1)+.37)/257
    truth=exact(grid);truthq=exact_flux(grid);opt=torch.optim.Adam(params,lr=.002);frames=[];limited=False;start=time.perf_counter()
    def loss_value():
        if kind=='strong':return fields(model,collocation)[2].square().mean()
        _,ux,_=fields(model,gx,False)
        return (((gw*ux)*dv).sum(dim=0)-load).square().mean()
    def record(step):
        u,ux,r=fields(model,grid);aq=moments(model,ax,aw,16)
        frames.append({'step':step,'seconds':time.perf_counter()-start,'trainLoss':float(loss_value().detach()),'relativeL2':float(((u-truth).norm()/truth.norm()).detach()),'fluxError':float(((-ux-truthq).norm()/truthq.norm()).detach()),'denseResidualRMS':float(r.square().mean().sqrt().detach()),'auditMoments':aq.detach().tolist(),'curve':u.detach().flatten().tolist()})
    record(0)
    for step in range(1,steps+1):
        if time.perf_counter()-start>seconds:limited=True;step-=1;break
        opt.zero_grad();loss=loss_value();loss.backward();opt.step()
        if step%200==0:record(step)
    if frames[-1]['step']!=step:record(step)
    elapsed=time.perf_counter()-start;u,ux,r=fields(model,ax);rm0=(aw*r*av).sum(dim=0);rm1=((aw*ux)*adv-aw*forcing(ax)*av).sum(dim=0);rm2=(-aw*u*addv-aw*forcing(ax)*av).sum(dim=0)
    tq=moments(model,gx,gw,k);hq=moments(model,ax,aw,k);boundary=model(torch.tensor([[-1.],[1.]])).detach().flatten().tolist();_,endux,_=fields(model,torch.tensor([[-1.],[1.]]))
    return {'kind':kind,'seed':seed,'parameters':sum(p.numel() for p in params),'steps':step,'seconds':elapsed,'budgetLimited':limited,'initialChecksum':checksum,'quadrature':None if kind=='strong' else q,'testCount':None if kind=='strong' else k,'boundaryValues':boundary,'relativeL2':frames[-1]['relativeL2'],'fluxError':frames[-1]['fluxError'],'field':frames[-1]['curve'],'trainLoss':frames[-1]['trainLoss'],'heldoutResidualRMS':float(fields(model,held)[2].square().mean().sqrt().detach()),'auditMoments':rm1.detach().tolist(),'momentQuadratureDifference':float((tq-hq).norm().detach()),'integrationByPartsError':float((rm0-rm1).abs().max().detach()),'twiceIntegratedError':float((rm2-rm1).abs().max().detach()),'globalBalanceDefect':float((-endux[1]+endux[0]-4).detach().item()),'frames':frames}

def main():
    p=argparse.ArgumentParser();p.add_argument('--steps',type=int,default=2000);p.add_argument('--seconds',type=float,default=90);p.add_argument('--seeds',default='11,22,33');p.add_argument('--output',default=str(Path(__file__).with_name('trace.json')));p.add_argument('--test-count',type=int);p.add_argument('--quadrature',type=int);a=p.parse_args()
    if not 1<=a.steps<=10000 or not 1<=a.seconds<=300:p.error('Use steps1..10000 and seconds1..300')
    seeds=[int(s) for s in a.seeds.split(',')]
    if not 1<=len(seeds)<=5:p.error('Use one to five seeds')
    custom=a.test_count is not None or a.quadrature is not None
    if custom and not(a.test_count is not None and a.quadrature is not None and 1<=a.test_count<=32 and 4<=a.quadrature<=128):p.error('Custom experiments need both --test-count1..32 and --quadrature4..128')
    if custom and Path(a.output).resolve()==Path(__file__).with_name('trace.json').resolve():p.error('Custom experiments must use --output with a new filename')
    torch.set_num_threads(4);torch.set_default_dtype(torch.float64);grid=torch.linspace(-1,1,301).reshape(-1,1)
    result={'paper':'https://arxiv.org/abs/1912.00873','scope':'Independent smooth heated-rod adaptation of equations4.7,4.20 and4.25; hard boundaries,Gauss-Legendre quadrature,small tanh network;not original shallow sine,Gauss-Jacobi/Lobatto,steep-layer or2D benchmarks;not hp-VPINNs.','config':{'layers':[1,16,16,1],'threads':4,'dtype':'float64','learningRate':.002,'steps':a.steps,'seeds':seeds,'collocationPoints':32,'testFamily':'P_(k+1)-P_(k-1)','normalisedTests':False,'auditQuadrature':128,'auditTests':16,'validationPoints':301,'heldoutPoints':257,'hardBoundaries':True,'perRunTrainingCapSeconds':a.seconds,'torch':torch.__version__,'numpy':np.__version__,'python':platform.python_version()},'x':grid.flatten().tolist(),'truth':exact(grid).flatten().tolist(),'truthFlux':exact_flux(grid).flatten().tolist(),'source':forcing(grid).flatten().tolist(),'runs':{}}
    result.update(diagnostics(grid))
    if custom:result['config']['customExperiment']={'testCount':a.test_count,'quadrature':a.quadrature}
    target=Path(a.output);target.parent.mkdir(parents=True,exist_ok=True)
    for seed in seeds:
        for kind in (['custom'] if custom else ['strong','weak-k1','weak-k8','weak-q4']):
            r=run(kind,seed,a.steps,a.seconds,grid,a.test_count,a.quadrature);result['runs'][f'{kind}-{seed}']=r
            print(json.dumps({k:r[k] for k in ['kind','seed','steps','seconds','relativeL2','heldoutResidualRMS','trainLoss','budgetLimited']}),flush=True)
            target.write_text(json.dumps(result),encoding='utf-8')
if __name__=='__main__':main()
