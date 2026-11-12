"""Small multiscale Fourier PINN teaching adaptation of Wang et al. 2012.10047."""
import argparse,json,math,time,platform
from pathlib import Path
import numpy as np
import torch
from torch import nn
KINDS=('plain','low','high','multi')
class Model(nn.Module):
 def __init__(self,seed,kind):
  super().__init__();self.kind=kind;torch.manual_seed(seed)
  if kind=='plain':self.core=nn.Linear(1,101);self.out=nn.Linear(101,1)
  else:
   self.core=nn.Linear(16,16);self.out=nn.Linear(32,1)
   g=torch.Generator().manual_seed(seed+1000);z=torch.randn(2,8,generator=g)
   scales={'low':[.5,.5],'high':[4.,4.],'multi':[.5,4.]}[kind]
   self.register_buffer('B',z*torch.tensor(scales)[:,None])
  for layer in (self.core,self.out):nn.init.xavier_normal_(layer.weight);nn.init.zeros_(layer.bias)
 def forward(self,x):
  if self.kind=='plain':return self.out(torch.tanh(self.core(x)))
  h=[]
  for b in self.B:
   a=2*math.pi*x@b.reshape(1,-1);h.append(torch.tanh(self.core(torch.cat([a.cos(),a.sin()],1))))
  return self.out(torch.cat(h,1))
def truth(x):return torch.sin(2*math.pi*x)+.1*torch.sin(12*math.pi*x)
def forcing(x):return (2*math.pi)**2*torch.sin(2*math.pi*x)+.1*(12*math.pi)**2*torch.sin(12*math.pi*x)
def residual(m,x):
 q=x.detach().requires_grad_(True);u=m(q);ux=torch.autograd.grad(u,q,torch.ones_like(u),create_graph=True)[0];uxx=torch.autograd.grad(ux,q,torch.ones_like(ux),create_graph=True)[0];return -uxx-forcing(q)
def kernel(m,x):
 y=m(x);params=list(m.parameters());j=torch.stack([torch.cat([v.flatten() for v in torch.autograd.grad(a,params,retain_graph=True)]) for a in y.flatten()]);return (j@j.T/len(x)).detach()
def run(seed,kind,steps,cap):
 m=Model(seed,kind);x=((torch.arange(96)+.5)/96).reshape(-1,1);ends=torch.tensor([[0.],[1.]]);grid=torch.linspace(0,1,401).reshape(-1,1);held=((torch.arange(389)+.37)/389).reshape(-1,1);kg=torch.linspace(0,1,41).reshape(-1,1)
 k=kernel(m,kg);ev,q=torch.linalg.eigh(k);vectors=q[:,-3:].T.flip(0);modes=torch.cat([torch.sin(2*math.pi*kg),torch.sin(12*math.pi*kg)],1);modes=modes/torch.linalg.vector_norm(modes,dim=0)
 align=(q[:,-8:].T@modes).square().sum(0);rates=(modes*(k@modes)).sum(0);opt=torch.optim.Adam(m.parameters(),lr=.001);frames=[];start=time.perf_counter();scale=float(forcing(x).square().mean().sqrt());initial={n:p.detach().tolist() for n,p in m.named_parameters()}
 def record(n):
  with torch.no_grad():u=m(grid);err=float(torch.linalg.vector_norm(u-truth(grid))/torch.linalg.vector_norm(truth(grid)));co=[float(2*torch.trapezoid((u*torch.sin(v*math.pi*grid)).flatten(),grid.flatten())) for v in (2,12)];boundary=float(m(ends).square().mean().sqrt())
  frames.append(dict(step=n,curve=u.flatten().tolist(),relativeL2=err,coefficients=co,modeErrors=[abs(co[0]-1),abs(co[1]-.1)],boundaryRMS=boundary,residualRMS=float(residual(m,x).detach().square().mean().sqrt())))
 record(0)
 for n in range(1,steps+1):
  opt.zero_grad();r=residual(m,x)/scale;loss=r.square().mean()+m(ends).square().mean();loss.backward();opt.step()
  if n%100==0 or n==steps:record(n)
  if time.perf_counter()-start>cap:break
 if frames[-1]['step']!=n:record(n)
 return dict(kind=kind,seed=seed,steps=n,limited=n<steps,seconds=time.perf_counter()-start,parameters=sum(p.numel() for p in m.parameters()),B=m.B.tolist() if kind!='plain' else None,initialParameters=initial,finalParameters={n:p.detach().tolist() for n,p in m.named_parameters()},kernel=k.tolist(),eigenvalues=ev.tolist(),leadingEigenvectors=vectors.tolist(),top8ModeAlignment=align.tolist(),modeRayleigh=rates.tolist(),frames=frames,relativeL2=frames[-1]['relativeL2'],heldoutResidualRMS=float(residual(m,held).detach().square().mean().sqrt()),boundaryRMS=frames[-1]['boundaryRMS'])
def main():
 p=argparse.ArgumentParser();p.add_argument('--steps',type=int,default=2000);p.add_argument('--seeds',type=int,nargs='+',default=[11,22,33]);p.add_argument('--cap',type=float,default=90);p.add_argument('--output',type=Path);a=p.parse_args()
 if a.output is None and (a.steps!=2000 or a.seeds!=[11,22,33] or a.cap!=90):p.error('Modified experiments require --output new-file.json')
 torch.set_default_dtype(torch.float64);torch.set_num_threads(4);runs={}
 for seed in a.seeds:
  for kind in KINDS:
   r=run(seed,kind,a.steps,a.cap);runs[f'{kind}-{seed}']=r;print(kind,seed,r['steps'],round(r['seconds'],2),round(r['relativeL2'],5),flush=True)
 x=np.linspace(0,1,401);data=dict(schema='fourier-cpu-v1',paper='2012.10047',scope='Teaching adaptation: signed steady rod, two-scale source, tiny shared-core branches; not the original high-frequency benchmarks or a constant-kernel theorem.',torch=torch.__version__,python=platform.python_version(),threads=4,dtype='float64',steps=a.steps,seeds=a.seeds,x=x.tolist(),truth=(np.sin(2*np.pi*x)+.1*np.sin(12*np.pi*x)).tolist(),kernelX=np.linspace(0,1,41).tolist(),residualScale=float(forcing(((torch.arange(96)+.5)/96).reshape(-1,1)).square().mean().sqrt()),runs=runs)
 out=a.output or Path(__file__).with_name('trace.json');out.write_text(json.dumps(data,allow_nan=False),encoding='utf-8')
if __name__=='__main__':main()
