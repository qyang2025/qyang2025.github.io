"""Tiny supervised function-to-field operator experiment. Analytic labels,no expensive simulation."""
import argparse,json,math,time,platform
from pathlib import Path
import numpy as np
import torch
from torch import nn
KINDS=('deeponet','linear','concat');SCALE=1/math.pi**2

def forcing(coeff,x):
 k=torch.arange(1,coeff.shape[1]+1,dtype=x.dtype);return coeff@torch.sin(math.pi*x.reshape(-1,1)*k).T

def exact(coeff,x):
 k=torch.arange(1,coeff.shape[1]+1,dtype=x.dtype);return (coeff/(math.pi*k).square())@torch.sin(math.pi*x.reshape(-1,1)*k).T

def datasets():
 rng=np.random.default_rng(2026);train=torch.tensor(rng.uniform(-1,1,(24,3)));test=torch.tensor(rng.uniform(-1,1,(16,3)));out=[]
 while len(out)<8:
  a=rng.uniform(-2,2,3)
  if np.max(np.abs(a))>1:out.append(a.tolist())
 return dict(train=train,test=test,amplitude=torch.tensor(out),frequency=torch.tensor([[0.,0.,0.,1.]]))

class Model(nn.Module):
 def __init__(self,kind,seed):
  super().__init__();torch.manual_seed(seed);self.kind=kind
  if kind=='concat':self.net=nn.Sequential(nn.Linear(10,40),nn.Tanh(),nn.Linear(40,1))
  else:
   self.branch=nn.Linear(9,8,bias=False) if kind=='linear' else nn.Sequential(nn.Linear(9,16),nn.Tanh(),nn.Linear(16,8));self.trunk=nn.Sequential(nn.Linear(1,16),nn.Tanh(),nn.Linear(16,8));self.bias=nn.Parameter(torch.zeros(())) if kind=='deeponet' else None
  for layer in self.modules():
   if isinstance(layer,nn.Linear):nn.init.xavier_normal_(layer.weight);nn.init.zeros_(layer.bias) if layer.bias is not None else None
 def grid(self,samples,x):
  x=x.reshape(-1,1);factor=(x*(1-x)).T
  if self.kind=='concat':
   m,n=len(samples),len(x);inputs=torch.cat([samples[:,None,:].expand(m,n,9),(2*x-1)[None,:,:].expand(m,n,1)],2);return self.net(inputs).squeeze(-1)*factor
  value=self.branch(samples)@self.trunk(2*x-1).T
  if self.bias is not None:value=value+self.bias
  return value*factor

def heldout_residual(model,samples,coeff,x):
 rows=[]
 for i in range(len(samples)):
  q=x.detach().reshape(-1,1).requires_grad_();u=model.grid(samples[i:i+1],q).flatten();ux=torch.autograd.grad(u.sum(),q,create_graph=True)[0];uxx=torch.autograd.grad(ux.sum(),q)[0];rows.append((-uxx.flatten()-forcing(coeff[i:i+1],q.detach()).flatten()).detach())
 return float(torch.cat(rows).square().mean().sqrt())

def run(kind,seed,steps,cap):
 d=datasets();sensors=(torch.arange(9)+.5)/9;xtrain=(torch.arange(12)+.5)/12;x=torch.linspace(0,1,201);inputs=forcing(d['train'],sensors);labels=exact(d['train'],xtrain);testinputs=forcing(d['test'],sensors);truth=exact(d['test'],x);net=Model(kind,seed);opt=torch.optim.Adam(net.parameters(),lr=.003);frames=[];initial={k:v.detach().tolist() for k,v in net.state_dict().items()};start=time.perf_counter()
 def record(n):
  with torch.no_grad():pred=net.grid(testinputs,x);frames.append(dict(step=n,exampleCurve=pred[0].tolist(),relativeL2=float(torch.linalg.vector_norm(pred-truth)/torch.linalg.vector_norm(truth)),labelLoss=float(((net.grid(inputs,xtrain)-labels)/SCALE).square().mean())))
 record(0)
 for n in range(1,steps+1):
  opt.zero_grad();loss=((net.grid(inputs,xtrain)-labels)/SCALE).square().mean();loss.backward();opt.step()
  if n%200==0 or n==steps:record(n)
  if time.perf_counter()-start>cap:break
 if frames[-1]['step']!=n:record(n)
 groups={}
 with torch.no_grad():
  for name,coeff in d.items():
   if name=='train':continue
   pred=net.grid(forcing(coeff,sensors),x);ref=exact(coeff,x);groups[name]=dict(predictions=pred.tolist(),relativeL2=float(torch.linalg.vector_norm(pred-ref)/torch.linalg.vector_norm(ref)),perFunctionRelativeL2=(torch.linalg.vector_norm(pred-ref,dim=1)/torch.linalg.vector_norm(ref,dim=1)).tolist())
  zero=net.grid(torch.zeros(1,9),x);a,b=testinputs[:8],testinputs[8:];mid=net.grid((a+b)/2,x);mean=(net.grid(a,x)+net.grid(b,x))/2;defect=float(torch.linalg.vector_norm(mid-mean)/(torch.linalg.vector_norm(mean)+1e-12));zeroMax=float(zero.abs().max())
 for name,coeff in d.items():
  if name!='train':groups[name]['heldoutResidualRMS']=heldout_residual(net,forcing(coeff,sensors),coeff,(torch.arange(197)+.37)/197)
 return dict(kind=kind,seed=seed,steps=n,limited=n<steps,seconds=time.perf_counter()-start,parameters=sum(p.numel() for p in net.parameters()),initialState=initial,finalState={k:v.detach().tolist() for k,v in net.state_dict().items()},frames=frames,groups=groups,zeroMax=zeroMax,midpointLinearityDefect=defect)

def main():
 p=argparse.ArgumentParser();p.add_argument('--steps',type=int,default=2400);p.add_argument('--seeds',nargs='+',type=int,default=[11,22,33]);p.add_argument('--cap',type=float,default=90);p.add_argument('--output',type=Path);a=p.parse_args()
 if a.output is None and(a.steps!=2400 or a.seeds!=[11,22,33] or a.cap!=90):p.error('Modified runs require --output new-file.json')
 torch.set_default_dtype(torch.float64);torch.set_num_threads(1);runs={}
 for seed in a.seeds:
  for kind in KINDS:
   r=run(kind,seed,a.steps,a.cap);runs[f'{kind}-{seed}']=r;print(kind,seed,round(r['seconds'],2),round(r['groups']['test']['relativeL2'],4),round(r['groups']['frequency']['relativeL2'],3),flush=True)
 d=datasets();x=torch.linspace(0,1,201);sensors=(torch.arange(9)+.5)/9;data=dict(schema='deeponet-poisson-cpu-v1',scope='Supervised teaching adaptation:fixed three-sine forcing family maps to zero-endpoint Poisson temperature.24training functions x12label locations;9input sensors;unstacked rank8 DeepONet,linear-branch engineering prior,and concatenation baseline. Hard boundary factors are added. Not original GRF or broad nonlinear-operator benchmarks;no universal extrapolation claim.',x=x.tolist(),sensors=sensors.tolist(),xTrain=((torch.arange(12)+.5)/12).tolist(),coefficients={k:v.tolist() for k,v in d.items()},forcing={k:forcing(v,x).tolist() for k,v in d.items()},sensorValues={k:forcing(v,sensors).tolist() for k,v in d.items()},truth={k:exact(v,x).tolist() for k,v in d.items()},trainingLabels=exact(d['train'],(torch.arange(12)+.5)/12).tolist(),trainingScale=SCALE,heldoutResidualLocations=197,steps=a.steps,threads=1,dtype='float64',torch=torch.__version__,python=platform.python_version(),runs=runs);(a.output or Path(__file__).with_name('trace.json')).write_text(json.dumps(data,allow_nan=False),encoding='utf-8')
if __name__=='__main__':main()
