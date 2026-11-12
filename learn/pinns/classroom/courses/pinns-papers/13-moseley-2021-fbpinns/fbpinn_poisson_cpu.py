"""Tiny CPU FBPINN adaptation: joint optimisation and C2 compact polynomial windows."""
import argparse,json,math,time,platform
from pathlib import Path
import numpy as np
import torch
from torch import nn
KINDS=('global','raw','local','narrow')
def window(z):return torch.clamp(1-z*z,min=0)**3
class Net(nn.Module):
 def __init__(self,w):
  super().__init__();self.a=nn.Linear(1,w);self.b=nn.Linear(w,1)
  for l in(self.a,self.b):nn.init.xavier_normal_(l.weight);nn.init.zeros_(l.bias)
 def forward(self,x):return self.b(torch.tanh(self.a(x)))
class Model(nn.Module):
 def __init__(self,seed,kind):
  super().__init__();torch.manual_seed(seed);self.kind=kind;self.radius=.14 if kind=='narrow' else .35;self.nets=nn.ModuleList([Net(97)] if kind=='global' else[Net(24) for _ in range(4)]);self.register_buffer('centres',torch.tensor([.125,.375,.625,.875]))
 def parts(self,x):
  if self.kind=='global':return self.nets[0](2*x-1)
  z=(x-self.centres)/self.radius;return torch.cat([window(z[:,i:i+1])*n(x if self.kind=='raw' else z[:,i:i+1]) for i,n in enumerate(self.nets)],1)
 def forward(self,x):return x*(1-x)*self.parts(x).sum(1,keepdim=True)
def truth(x):return torch.sin(2*math.pi*x)+.1*torch.sin(12*math.pi*x)
def slope(x):return 2*math.pi*torch.cos(2*math.pi*x)+1.2*math.pi*torch.cos(12*math.pi*x)
def forcing(x):return (2*math.pi)**2*torch.sin(2*math.pi*x)+.1*(12*math.pi)**2*torch.sin(12*math.pi*x)
def derivative(m,x):
 q=x.detach().requires_grad_();u=m(q);g=torch.autograd.grad(u,q,torch.ones_like(u),create_graph=True)[0];gg=torch.autograd.grad(g,q,torch.ones_like(g),create_graph=True)[0];return u,g,gg

def run(seed,kind,steps,cap):
 m=Model(seed,kind);x=((torch.arange(96)+.5)/96).reshape(-1,1);grid=torch.linspace(0,1,401).reshape(-1,1);held=((torch.arange(389)+.37)/389).reshape(-1,1);scale=float(forcing(x).square().mean().sqrt());opt=torch.optim.Adam(m.parameters(),lr=.001);frames=[];start=time.perf_counter();initial={k:p.detach().tolist() for k,p in m.named_parameters()}
 def record(n):
  u,g,gg=derivative(m,grid);r=-gg-forcing(grid);err=float((torch.linalg.vector_norm(u-truth(grid))/torch.linalg.vector_norm(truth(grid))).detach());parts=(grid*(1-grid)*m.parts(grid)).detach();frames.append(dict(step=n,curve=u.detach().flatten().tolist(),parts=parts.T.tolist(),relativeL2=err,slopeRelativeL2=float((torch.linalg.vector_norm(g-slope(grid))/torch.linalg.vector_norm(slope(grid))).detach()),residualRMS=float(r.detach().square().mean().sqrt())))
 record(0)
 for n in range(1,steps+1):
  opt.zero_grad();_,_,gg=derivative(m,x);r=(-gg-forcing(x))/scale;loss=r.square().mean();loss.backward();opt.step()
  if n%100==0 or n==steps:record(n)
  if time.perf_counter()-start>cap:break
 if frames[-1]['step']!=n:record(n)
 _,_,gg=derivative(m,held);return dict(kind=kind,seed=seed,steps=n,limited=n<steps,seconds=time.perf_counter()-start,parameters=sum(p.numel() for p in m.parameters()),radius=m.radius,initialParameters=initial,finalParameters={k:p.detach().tolist() for k,p in m.named_parameters()},frames=frames,relativeL2=frames[-1]['relativeL2'],heldoutResidualRMS=float((-gg-forcing(held)).detach().square().mean().sqrt()),boundaryValues=m(torch.tensor([[0.],[1.]])).detach().flatten().tolist())
def main():
 p=argparse.ArgumentParser();p.add_argument('--steps',type=int,default=2000);p.add_argument('--seeds',type=int,nargs='+',default=[11,22,33]);p.add_argument('--cap',type=float,default=90);p.add_argument('--output',type=Path);a=p.parse_args()
 if a.output is None and(a.steps!=2000 or a.seeds!=[11,22,33] or a.cap!=90):p.error('Modified experiments require --output new-file.json')
 torch.set_default_dtype(torch.float64);torch.set_num_threads(4);runs={}
 for seed in a.seeds:
  for k in KINDS:
   r=run(seed,k,a.steps,a.cap);runs[f'{k}-{seed}']=r;print(k,seed,r['steps'],round(r['seconds'],2),round(r['relativeL2'],5),flush=True)
 x=np.linspace(0,1,401);t=dict(schema='fbpinn-cpu-v1',scope='Compact teaching adaptation: four C2 polynomial windows, hard zero endpoints and joint global optimisation. Not the original sigmoid windows, detached-neighbour parallel algorithm or scheduling benchmarks.',steps=a.steps,seeds=a.seeds,x=x.tolist(),truth=(np.sin(2*np.pi*x)+.1*np.sin(12*np.pi*x)).tolist(),centres=[.125,.375,.625,.875],dtype='float64',threads=4,torch=torch.__version__,python=platform.python_version(),runs=runs)
 (a.output or Path(__file__).with_name('trace.json')).write_text(json.dumps(t,allow_nan=False),encoding='utf-8')
if __name__=='__main__':main()
