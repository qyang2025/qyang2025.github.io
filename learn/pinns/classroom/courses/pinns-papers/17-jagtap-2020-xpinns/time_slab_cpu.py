"""Time-slab XPINN teaching adaptation. Joint sequential CPU training,not parallel benchmark."""
import argparse,json,math,time,platform
from pathlib import Path
import numpy as np
import torch
from torch import nn
KINDS=('global','uncoupled','value','xpinn');ALPHA=.1
class Net(nn.Module):
 def __init__(self,width):
  super().__init__();self.a=nn.Linear(2,width);self.b=nn.Linear(width,1);nn.init.xavier_normal_(self.a.weight);nn.init.zeros_(self.a.bias);nn.init.normal_(self.b.weight,std=.08);nn.init.zeros_(self.b.bias)
 def forward(self,z):return self.b(torch.tanh(self.a(z)))
class Model(nn.Module):
 def __init__(self,kind,seed):
  super().__init__();torch.manual_seed(seed);self.kind=kind;self.nets=nn.ModuleList([Net(48)] if kind=='global' else [Net(24),Net(24)])
 def field(self,q,slab=0):
  x=q[:,0:1];t=q[:,1:2];zt=2*t-1 if self.kind=='global' else 4*t-(1 if slab==0 else 3);raw=self.nets[0 if self.kind=='global' else slab](torch.cat([2*x-1,zt],1));factor=x*(1-x)
  return torch.sin(math.pi*x)+t*factor*raw if self.kind=='global' or slab==0 else factor*raw
 def forward(self,q):
  if self.kind=='global':return self.field(q)
  mask=q[:,1]<.5;out=torch.empty((len(q),1),dtype=q.dtype);out[mask]=self.field(q[mask],0);out[~mask]=self.field(q[~mask],1);return out

def exact(q):return torch.sin(math.pi*q[:,0:1])*torch.exp(-ALPHA*math.pi**2*q[:,1:2])
def derivatives(m,q,slab):
 p=q.detach().requires_grad_();u=m.field(p,slab);g=torch.autograd.grad(u,p,torch.ones_like(u),create_graph=True)[0];uxx=torch.autograd.grad(g[:,0].sum(),p,create_graph=True)[0][:,0:1];return u,g[:,0:1],g[:,1:2]-ALPHA*uxx

def points(n,lo,hi,g):
 p=torch.rand((n,2),generator=g);p[:,1]=lo+(hi-lo)*p[:,1];return p

def run(kind,seed,steps,cap):
 m=Model(kind,seed);g=torch.Generator().manual_seed(2026);p0=points(48,0,.5,g);p1=points(48,.5,1,g);xi=(torch.arange(16)+.5)/16;interface=torch.stack([xi,xi*0+.5],1);x=torch.linspace(0,1,81);times=torch.tensor([0.,.25,.5,.75,1.]);mesh=torch.stack([x.repeat(5),times.repeat_interleave(81)],1);held0=points(389,0,.5,torch.Generator().manual_seed(824));held1=points(389,.5,1,torch.Generator().manual_seed(825));truth=exact(mesh);opt=torch.optim.Adam(m.parameters(),lr=.002);frames=[];initial={k:v.detach().tolist() for k,v in m.state_dict().items()};start=time.perf_counter()
 def record(n):
  with torch.no_grad():curve=m(mesh);rel=float(torch.linalg.vector_norm(curve-truth)/torch.linalg.vector_norm(truth));fields=curve.reshape(5,81).tolist()
  a,ax,ar=derivatives(m,interface,0);b,bx,br=derivatives(m,interface,1);frames.append(dict(step=n,fields=fields,relativeL2=rel,valueJumpRMS=float((a-b).detach().square().mean().sqrt()),residualJumpRMS=float((ar-br).detach().square().mean().sqrt()),slopeJumpRMS=float((ax-bx).detach().square().mean().sqrt()),leftInterface=a.detach().flatten().tolist(),rightInterface=b.detach().flatten().tolist(),xInterface=xi.tolist()))
 record(0)
 for n in range(1,steps+1):
  opt.zero_grad();_,_,r0=derivatives(m,p0,0);_,_,r1=derivatives(m,p1,1);loss=.5*(r0.square().mean()+r1.square().mean())
  if kind in ('value','xpinn'):
   a,_,ra=derivatives(m,interface,0);b,_,rb=derivatives(m,interface,1);average=(a+b)/2;loss=loss+50*((a-average).square().mean()+(b-average).square().mean())
   if kind=='xpinn':loss=loss+(ra-rb).square().mean()
  loss.backward();opt.step()
  if n%200==0 or n==steps:record(n)
  if time.perf_counter()-start>cap:break
 if frames[-1]['step']!=n:record(n)
 held0r=derivatives(m,held0,0)[2].detach();held1r=derivatives(m,held1,1)[2].detach();last=frames[-1];vx=torch.linspace(0,1,201);vt=torch.linspace(0,1,101);vq=torch.stack([vx.repeat(101),vt.repeat_interleave(201)],1)
 with torch.no_grad():validation_error=float(torch.linalg.vector_norm(m(vq)-exact(vq))/torch.linalg.vector_norm(exact(vq)))
 return dict(kind=kind,seed=seed,steps=n,limited=n<steps,seconds=time.perf_counter()-start,parameters=sum(p.numel() for p in m.parameters()),initialState=initial,finalState={k:v.detach().tolist() for k,v in m.state_dict().items()},frames=frames,relativeL2=last['relativeL2'],validationRelativeL2=validation_error,validationGridShape=[101,201],valueJumpRMS=last['valueJumpRMS'],residualJumpRMS=last['residualJumpRMS'],heldoutResidualRMS=float(torch.cat([held0r,held1r]).square().mean().sqrt()),residualPoints=[p0.tolist(),p1.tolist()],interfacePoints=interface.tolist())

def main():
 p=argparse.ArgumentParser();p.add_argument('--steps',type=int,default=2000);p.add_argument('--seeds',nargs='+',type=int,default=[11,22,33]);p.add_argument('--cap',type=float,default=90);p.add_argument('--output',type=Path);a=p.parse_args()
 if a.output is None and(a.steps!=2000 or a.seeds!=[11,22,33] or a.cap!=90):p.error('Modified runs require --output new-file.json')
 torch.set_default_dtype(torch.float64);torch.set_num_threads(1);runs={}
 for seed in a.seeds:
  for k in KINDS:
   r=run(k,seed,a.steps,a.cap);runs[f'{k}-{seed}']=r;print(k,seed,r['steps'],round(r['seconds'],2),round(r['relativeL2'],4),round(r['valueJumpRMS'],4),flush=True)
 x=torch.linspace(0,1,81);times=[0.,.25,.5,.75,1.];mesh=torch.stack([x.repeat(5),torch.tensor(times).repeat_interleave(81)],1);data=dict(schema='xpinn-time-slab-cpu-v1',scope='Two time-slab heat-equation teaching adaptation of XPINN average-solution and residual-continuity losses. Exact spatial endpoints and first-slab initial profile; all subnetworks jointly updated on one CPU thread. Not original irregular multidimensional benchmarks or parallel speedup reproduction.',diffusivity=ALPHA,x=x.tolist(),times=times,truth=exact(mesh).reshape(5,81).tolist(),interfaceTime=.5,validationGridShape=[101,201],steps=a.steps,threads=1,dtype='float64',torch=torch.__version__,python=platform.python_version(),runs=runs);(a.output or Path(__file__).with_name('trace.json')).write_text(json.dumps(data,allow_nan=False),encoding='utf-8')
if __name__=='__main__':main()
