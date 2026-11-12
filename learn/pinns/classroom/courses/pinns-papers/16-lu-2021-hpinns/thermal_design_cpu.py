"""Small hPINN inverse-design adaptation, with independent finite-volume verification."""
import argparse,json,math,time,platform
from pathlib import Path
import numpy as np
import torch
from torch import nn
KINDS=('weak','strong','augmented');VOLUME=.4
class Design(nn.Module):
 def __init__(self,seed):
  super().__init__();torch.manual_seed(seed);self.a=nn.Linear(1,24);self.b=nn.Linear(24,1);nn.init.xavier_normal_(self.a.weight);nn.init.zeros_(self.a.bias);nn.init.normal_(self.b.weight,std=.03);nn.init.constant_(self.b.bias,-.3);self.d=nn.Parameter(torch.tensor([math.log(.4/.6),0.]))
 def density(self,x):return torch.sigmoid(self.d[0]+6*torch.tanh(self.d[1])*torch.cos(2*math.pi*x))
 def conductivity(self,x):return .2+1.8*self.density(x)
 def forward(self,x):return x*(1-x)*torch.nn.functional.softplus(self.b(torch.tanh(self.a(2*x-1))))
def residual(m,points):
 x=points.detach().requires_grad_();u=m(x);ux=torch.autograd.grad(u,x,torch.ones_like(u),create_graph=True)[0];flux=m.conductivity(x)*ux;return -torch.autograd.grad(flux,x,torch.ones_like(flux),create_graph=True)[0]-1

def fv(d0,d1,n=256):
 x=np.linspace(0,1,n+1);mid=(x[:-1]+x[1:])/2;rho=1/(1+np.exp(-np.clip(d0+d1*np.cos(2*np.pi*mid),-60,60)));k=.2+1.8*rho;diag=(k[:-1]+k[1:])*n*n;lower=-k[1:-1]*n*n;upper=lower.copy();rhs=np.ones(n-1);a=diag.copy()
 for i in range(1,n-1):z=lower[i-1]/a[i-1];a[i]-=z*upper[i-1];rhs[i]-=z*rhs[i-1]
 u=np.zeros(n+1);u[-2]=rhs[-1]/a[-1]
 for i in range(n-3,-1,-1):u[i+1]=(rhs[i]-upper[i]*u[i+2])/a[i]
 return x,u,float(np.trapezoid(u,x)),float(rho.mean())
def family_reference():
 rows=[];x=(np.arange(1024)+.5)/1024
 for d1 in np.linspace(-6,6,121):
  lo,hi=-15.,15.
  for _ in range(60):
   d0=(lo+hi)/2;v=np.mean(1/(1+np.exp(-(d0+d1*np.cos(2*np.pi*x)))))
   if v<VOLUME:lo=d0
   else:hi=d0
  d0=(lo+hi)/2;xx,u,j,volume=fv(d0,float(d1),1024);rows.append(dict(d0=d0,d1=float(d1),objective=j,volume=volume))
 return dict(best=min(rows,key=lambda r:r['objective']),rows=rows)
def run(kind,seed,steps,cap):
 m=Design(seed);x=((torch.arange(96)+.5)/96).reshape(-1,1);quad=((torch.arange(128)+.5)/128).reshape(-1,1);grid=torch.linspace(0,1,201).reshape(-1,1);held=((torch.arange(389)+.37)/389).reshape(-1,1);netparams=[p for n,p in m.named_parameters() if n!='d'];opt=torch.optim.Adam([{'params':netparams,'lr':.003},{'params':[m.d],'lr':.006}]);lam=torch.zeros_like(x);lv=torch.tensor(0.);penalty=10.;frames=[];start=time.perf_counter();initial={n:p.detach().tolist() for n,p in m.named_parameters()}
 def record(n):
  with torch.no_grad():u=m(grid).flatten();rho=m.density(grid).flatten();d0=float(m.d[0]);d1=float(6*torch.tanh(m.d[1]));j=float(m(quad).mean());vol=float(m.density(quad).mean())
  xx,physical,jp,vp=fv(d0,d1);frames.append(dict(step=n,curve=u.tolist(),density=rho.tolist(),physicalCurve=np.interp(grid[:,0].numpy(),xx,physical).tolist(),neuralObjective=j,physicalObjective=jp,volume=vol,independentVolume=vp,residualRMS=float(residual(m,x).detach().square().mean().sqrt()),d0=d0,d1=d1,multiplierRMS=float(lam.square().mean().sqrt()),volumeMultiplier=float(lv)))
 record(0)
 for n in range(1,steps+1):
  opt.zero_grad();r=residual(m,x);g=m.density(quad).mean()-VOLUME;j=m(quad).mean()
  if kind=='weak':loss=j+.001*r.square().mean()+10*g*g
  elif kind=='strong':loss=j+100*r.square().mean()+100*g*g
  else:loss=j+(lam*r).mean()+.5*penalty*r.square().mean()+lv*g+.5*penalty*g*g
  loss.backward();opt.step()
  if kind=='augmented' and n%250==0:
   lam=lam+penalty*residual(m,x).detach();lv=lv+penalty*(m.density(quad).mean().detach()-VOLUME)
  if n%200==0 or n==steps:record(n)
  if time.perf_counter()-start>cap:break
 if frames[-1]['step']!=n:record(n)
 final=frames[-1];return dict(kind=kind,seed=seed,steps=n,limited=n<steps,seconds=time.perf_counter()-start,parameters=sum(p.numel() for p in m.parameters()),initialParameters=initial,finalParameters={k:p.detach().tolist() for k,p in m.named_parameters()},frames=frames,neuralObjective=final['neuralObjective'],physicalObjective=final['physicalObjective'],volume=final['independentVolume'],heldoutResidualRMS=float(residual(m,held).detach().square().mean().sqrt()),volumeFeasible=abs(final['independentVolume']-VOLUME)<.005)
def main():
 p=argparse.ArgumentParser();p.add_argument('--steps',type=int,default=3000);p.add_argument('--seeds',type=int,nargs='+',default=[11,22,33]);p.add_argument('--cap',type=float,default=90);p.add_argument('--output',type=Path);a=p.parse_args()
 if a.output is None and(a.steps!=3000 or a.seeds!=[11,22,33] or a.cap!=90):p.error('Modified runs require --output new-file.json')
 torch.set_default_dtype(torch.float64);torch.set_num_threads(1);runs={}
 for seed in a.seeds:
  for k in KINDS:
   r=run(k,seed,a.steps,a.cap);runs[f'{k}-{seed}']=r;print(k,seed,r['steps'],round(r['seconds'],2),round(r['neuralObjective'],5),round(r['physicalObjective'],5),round(r['volume'],5),flush=True)
 x,u,j,v=fv(math.log(.4/.6),0);data=dict(schema='hpinn-design-cpu-v1',scope='Two-parameter symmetric thermal design adaptation of hard constraints and augmented Lagrangians. Not original holography/Stokes topology benchmarks; finite-volume solves are independent validation, not the training loop.',x=np.linspace(0,1,201).tolist(),volumeTarget=VOLUME,conductivityBounds=[.2,2.],uniform=dict(objective=j,volume=v,curve=np.interp(np.linspace(0,1,201),x,u).tolist()),reference=family_reference(),steps=a.steps,threads=1,dtype='float64',torch=torch.__version__,python=platform.python_version(),runs=runs);(a.output or Path(__file__).with_name('trace.json')).write_text(json.dumps(data,allow_nan=False),encoding='utf-8')
if __name__=='__main__':main()
