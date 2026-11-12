"""HFM teaching reduction: infer constant2D flow from passive tracer, not full flow benchmarks."""
import argparse,json,math,time,platform
from pathlib import Path
import numpy as np
import torch
from torch import nn
KINDS=('full','noisy','data','stripe')
def exact(q,stripe=False):
 x,y,t=q[:,0:1],q[:,1:2],q[:,2:3];X=x-.8*t;Y=y-.35*t
 return .5+.35*torch.sin(X)*torch.exp(-.02*t) if stripe else .5+.25*torch.sin(X)*torch.cos(Y)*torch.exp(-.04*t)+.08*torch.cos(2*X)*torch.sin(Y)*torch.exp(-.10*t)
class Model(nn.Module):
 def __init__(self,seed,stripe=False):
  super().__init__();self.stripe=stripe;torch.manual_seed(seed);self.net=nn.Sequential(nn.Linear(3 if stripe else 5,24),nn.Tanh(),nn.Linear(24,24),nn.Tanh(),nn.Linear(24,1))
  for a in self.net:
   if isinstance(a,nn.Linear):nn.init.xavier_normal_(a.weight);nn.init.zeros_(a.bias)
  g=torch.Generator().manual_seed(seed+1000);self.a=nn.Parameter(torch.randn((),generator=g)*.3);self.b=nn.Parameter(torch.randn((),generator=g)*.3)
 def forward(self,q):
  x,y,t=q[:,0:1],q[:,1:2],q[:,2:3];f=torch.cat([x.sin(),x.cos(),2*t-1] if self.stripe else[x.sin(),x.cos(),y.sin(),y.cos(),2*t-1],1);return .5+.5*torch.tanh(self.net(f))
def residual(m,points):
 q=points.detach().requires_grad_();c=m(q);g=torch.autograd.grad(c,q,torch.ones_like(c),create_graph=True)[0];gx=torch.autograd.grad(g[:,0].sum(),q,create_graph=True)[0][:,0:1];gy=torch.autograd.grad(g[:,1].sum(),q,create_graph=True)[0][:,1:2];return g[:,2:3]+m.a*g[:,0:1]+m.b*g[:,1:2]-.02*(gx+gy)
def points(n,g):return torch.rand(n,3,generator=g)*torch.tensor([2*math.pi,2*math.pi,1.])
def run(kind,seed,steps,cap):
 stripe=kind=='stripe';m=Model(seed,stripe);g=torch.Generator().manual_seed(2026);data=points(144,g);data[:,2]=torch.tensor([0.,.5,1.]).repeat_interleave(48);truth=exact(data,stripe);noise=torch.randn(truth.shape,generator=g);labels=truth+(.02*noise if kind=='noisy' else 0);rpoints=points(256,g);held=points(1000,torch.Generator().manual_seed(924));axis=torch.linspace(0,2*math.pi,21);X,Y=torch.meshgrid(axis,axis,indexing='xy');meshes=[torch.stack([X.flatten(),Y.flatten(),torch.full((X.numel(),),t)],1) for t in [0.,.5,1.]];opt=torch.optim.Adam([{'params':m.net.parameters(),'lr':.002},{'params':[m.a,m.b],'lr':.006}]);initial=[float(m.a.detach()),float(m.b.detach())];frames=[];start=time.perf_counter()
 def record(n):
  with torch.no_grad():pred=m(held);u=exact(held,stripe);frames.append(dict(step=n,a=float(m.a),b=float(m.b),fieldRMSE=float((pred-u).square().mean().sqrt()),fluctuationRelativeL2=float(torch.linalg.vector_norm(pred-u)/torch.linalg.vector_norm(u-.5)),dataRMSE=float((m(data)-labels).square().mean().sqrt()),fields=[m(q).flatten().tolist() for q in meshes]))
 record(0)
 for n in range(1,steps+1):
  opt.zero_grad();ld=(m(data)-labels).square().mean();lr=residual(m,rpoints).square().mean() if n>500 and kind!='data' else torch.tensor(0.);loss=20*ld+lr;loss.backward();opt.step()
  if n%100==0 or n==steps:record(n)
  if time.perf_counter()-start>cap:break
 if frames[-1]['step']!=n:record(n)
 rr=float(residual(m,held).detach().square().mean().sqrt());return dict(kind=kind,seed=seed,steps=n,limited=n<steps,seconds=time.perf_counter()-start,parameters=sum(p.numel() for p in m.parameters()),initialVelocity=initial,initialDataSeed=2026,frames=frames,finalState={k:p.detach().tolist() for k,p in m.state_dict().items()},a=frames[-1]['a'],b=frames[-1]['b'],fieldRMSE=frames[-1]['fieldRMSE'],fluctuationRelativeL2=frames[-1]['fluctuationRelativeL2'],heldoutResidualRMS=rr,observations=dict(points=data.tolist(),labels=labels.flatten().tolist()),residualPoints=rpoints.tolist())
def main():
 p=argparse.ArgumentParser();p.add_argument('--steps',type=int,default=2000);p.add_argument('--seeds',nargs='+',type=int,default=[11,22,33]);p.add_argument('--cap',type=float,default=90);p.add_argument('--output',type=Path);a=p.parse_args()
 if a.output is None and(a.steps!=2000 or a.seeds!=[11,22,33] or a.cap!=90):p.error('Modified runs require --output new-file.json')
 torch.set_default_dtype(torch.float64);torch.set_num_threads(2);runs={}
 for seed in a.seeds:
  for k in KINDS:
   r=run(k,seed,a.steps,a.cap);runs[f'{k}-{seed}']=r;print(k,seed,r['steps'],round(r['seconds'],2),round(r['a'],4),round(r['b'],4),round(r['fluctuationRelativeL2'],4),flush=True)
 axis=torch.linspace(0,2*math.pi,21);X,Y=torch.meshgrid(axis,axis,indexing='xy');truth=[]
 for t in [0.,.5,1.]:truth.append(exact(torch.stack([X.flatten(),Y.flatten(),torch.full((X.numel(),),t)],1)).flatten().tolist())
 out=a.output or Path(__file__).with_name('trace.json');out.write_text(json.dumps(dict(schema='hfm-cpu-v1',scope='Reduced HFM transport mechanism: constant incompressible velocity and constant pressure satisfy unforced Navier-Stokes by construction. Neural tracer plus2 velocity coefficients; not full spatial velocity/pressure reconstruction, no biomedical benchmark reproduction.',x=axis.tolist(),times=[0.,.5,1.],truth=truth,trueVelocity=[.8,.35],diffusivity=.02,steps=a.steps,pretrainSteps=500,threads=2,dtype='float64',torch=torch.__version__,python=platform.python_version(),runs=runs),allow_nan=False),encoding='utf-8')
if __name__=='__main__':main()
