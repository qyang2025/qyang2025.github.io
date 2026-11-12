"""Finite empirical PINN NTK teaching study; CPU only, not infinite-width proof."""
import argparse,hashlib,json,math,platform,time
from pathlib import Path
import numpy as np
import torch
from torch import nn
class Rod(nn.Module):
 def __init__(self,seed,width=32):
  super().__init__();torch.manual_seed(seed);self.width=width;self.w=nn.Parameter(torch.randn(width,1));self.b=nn.Parameter(torch.randn(width));self.a=nn.Parameter(torch.randn(width,1));self.c=nn.Parameter(torch.randn(1))
 def forward(self,x):return torch.tanh(x@self.w.T+self.b)@self.a/math.sqrt(self.width)+self.c
def truth(x):return torch.sin(math.pi*x)
def source(x):return math.pi**2*truth(x)
def residual(m,x):
 q=x.detach().requires_grad_(True);u=m(q);g=torch.autograd.grad(u,q,torch.ones_like(u),create_graph=True)[0];gg=torch.autograd.grad(g,q,torch.ones_like(g),create_graph=True)[0];return -gg-source(q)
def jacobian(values,m):
 params=list(m.parameters());rows=[]
 for v in values.flatten():
  gs=torch.autograd.grad(v,params,retain_graph=True,allow_unused=True);rows.append(torch.cat([(torch.zeros_like(p) if g is None else g).flatten() for p,g in zip(params,gs)]))
 return torch.stack(rows).detach()
def kernel(m,x,b):
 jb=jacobian(m(b),m)/math.sqrt(len(b));jr=jacobian(residual(m,x),m)/math.sqrt(len(x));j=torch.cat([jb,jr]);k=j@j.T;return k,float(jb.square().sum()),float(jr.square().sum())
def weights(k,tb,tr,kind):return (1.,1.) if kind=='unit' else ((tb+tr)/tb,(tb+tr)/tr)
def weighted(k,wb,wr):
 s=torch.tensor([math.sqrt(wb)]*2+[math.sqrt(wr)]*(len(k)-2));return s[:,None]*k*s[None,:]
def run(seed,kind,steps,cap):
 m=Rod(seed);x=(torch.arange(24,dtype=torch.float64)+.5).reshape(-1,1)/24;b=torch.tensor([[0.],[1.]]);grid=torch.linspace(0,1,301).reshape(-1,1);held=(torch.arange(257,dtype=torch.float64)+.37).reshape(-1,1)/257
 k0,tb0,tr0=kernel(m,x,b);wb,wr=weights(k0,tb0,tr0,kind);balanced=weighted(k0,*weights(k0,tb0,tr0,'frozen'));eta=.05/max(float(torch.linalg.eigvalsh(k0).max()),float(torch.linalg.eigvalsh(balanced).max()));opt=torch.optim.SGD(m.parameters(),lr=eta)
 initial=hashlib.sha256(b''.join(p.detach().numpy().tobytes() for p in m.parameters())).hexdigest();initialtheta=torch.cat([p.detach().flatten() for p in m.parameters()]);frames=[];start=time.perf_counter();limited=False
 def record(step,k=None):
  nonlocal wb,wr
  if k is None:k,tb,tr=kernel(m,x,b)
  else:tb,tr=float(k[:2,:2].trace()),float(k[2:,2:].trace())
  with torch.no_grad():pred=m(grid);uerr=float(torch.linalg.vector_norm(pred-truth(grid))/torch.linalg.vector_norm(truth(grid)));boundary=float(m(b).square().mean().sqrt());theta=torch.cat([p.detach().flatten() for p in m.parameters()])
  rr=residual(m,x);w=weighted(k,wb,wr);eigen=torch.linalg.eigvalsh(w);frames.append({'step':step,'seconds':time.perf_counter()-start,'curve':pred.flatten().tolist(),'relativeL2':uerr,'boundaryRMS':boundary,'residualRMS':float(rr.detach().square().mean().sqrt()),'boundaryWeight':wb,'residualWeight':wr,'traceBoundary':tb,'traceResidual':tr,'kernelDrift':float(torch.linalg.matrix_norm(k-k0)/torch.linalg.matrix_norm(k0)),'parameterDrift':float(torch.linalg.vector_norm(theta-initialtheta)/torch.linalg.vector_norm(initialtheta)),'eigenvalues':eigen.tolist(),'maxWeightedEigenvalue':float(eigen.max()),'learningRate':eta})
 record(0,k0)
 for step in range(1,steps+1):
  if time.perf_counter()-start>cap:limited=True;step-=1;break
  if kind=='adaptive' and step>1 and (step-1)%400==0:
   k,tb,tr=kernel(m,x,b);wb,wr=weights(k,tb,tr,kind)
   # Fixed common eta across policies: no learning-rate retuning after a weight refresh.
  opt.zero_grad();loss=.5*(wb*m(b).square().mean()+wr*residual(m,x).square().mean());loss.backward();opt.step()
  if step%400==0:record(step)
 if frames[-1]['step']!=step:record(step)
 elapsed=time.perf_counter()-start;kf,_,_=kernel(m,x,b);rh=residual(m,held).detach()
 # Frozen-kernel flow is an independent diagnostic in symmetrised weighted coordinates.
 initialmodel=Rod(seed);raw0=torch.cat([initialmodel(b).detach().flatten()/math.sqrt(2),residual(initialmodel,x).detach().flatten()/math.sqrt(len(x))]);wb0,wr0=weights(k0,tb0,tr0,kind);s=torch.tensor([math.sqrt(wb0)]*2+[math.sqrt(wr0)]*24);A=weighted(k0,wb0,wr0);ev,V=torch.linalg.eigh(A);z0=s*raw0;linear=[]
 for f in frames:
  z=V@(torch.exp(-ev.clamp_min(0)*eta*f['step'])*(V.T@z0));e=z/s;linear.append({'step':f['step'],'boundaryRMS':float(torch.linalg.vector_norm(e[:2])),'residualRMS':float(torch.linalg.vector_norm(e[2:]))})
 return {'kind':kind,'seed':seed,'parameters':sum(p.numel() for p in m.parameters()),'initialChecksum':initial,'steps':step,'seconds':elapsed,'budgetLimited':limited,'learningRate':eta,'relativeL2':frames[-1]['relativeL2'],'boundaryRMS':frames[-1]['boundaryRMS'],'heldoutResidualRMS':float(rh.square().mean().sqrt()),'frames':frames,'initialKernel':k0.tolist(),'finalKernel':kf.tolist(),'frozenFlow':linear,'initialTraceBoundary':tb0,'initialTraceResidual':tr0}
def main():
 p=argparse.ArgumentParser();p.add_argument('--steps',type=int,default=2400);p.add_argument('--seconds',type=float,default=90);p.add_argument('--seeds',default='11,22,33');p.add_argument('--output',default=str(Path(__file__).with_name('trace.json')));a=p.parse_args();seeds=[int(x) for x in a.seeds.split(',')]
 if not 1<=a.steps<=10000 or not 1<=a.seconds<=300 or not 1<=len(seeds)<=5:p.error('Budget outside teaching limits')
 if Path(a.output).resolve()==Path(__file__).with_name('trace.json').resolve() and (a.steps!=2400 or a.seconds!=90 or seeds!=[11,22,33]):p.error('Save exploratory settings with --output a-new-file.json')
 torch.set_default_dtype(torch.float64);torch.set_num_threads(4);x=torch.linspace(0,1,301);t={'paper':'https://arxiv.org/abs/2007.14527','scope':'Independent small Poisson rod adaptation: empirical finite-width NTK with mean-normalised output blocks; single hidden layer width32, not original width100/500 or wave benchmarks. Fixed-step SGD with an initial empirical spectral heuristic is not a global stability guarantee or infinite-width convergence proof.','config':{'seeds':seeds,'steps':a.steps,'width':32,'parameters':97,'threads':4,'dtype':'float64','interiorPoints':24,'boundaryPoints':2,'weightRefresh':400,'capSeconds':a.seconds,'torch':torch.__version__,'numpy':np.__version__,'python':platform.python_version(),'meanNormalisedKernel':True,'lossHalfMeans':True,'commonLearningRatePerSeed':True},'x':x.tolist(),'truth':torch.sin(math.pi*x).tolist(),'runs':{}}
 for seed in seeds:
  for kind in ['unit','frozen','adaptive']:
   r=run(seed,kind,a.steps,a.seconds);t['runs'][f'{kind}-{seed}']=r;Path(a.output).write_text(json.dumps(t,allow_nan=False),encoding='utf8');print(json.dumps({k:r[k] for k in ['kind','seed','relativeL2','boundaryRMS','steps','seconds','learningRate']}),flush=True)
if __name__=='__main__':main()
