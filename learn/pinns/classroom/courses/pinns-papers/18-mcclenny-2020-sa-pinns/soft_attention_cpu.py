"""Tiny self-adaptive residual-mask experiment. No Allen-Cahn/Burgers benchmark claim."""
import argparse,json,math,time,platform
from pathlib import Path
import numpy as np
import torch
from torch import nn
EPS=.025;KINDS=('fixed16','shared16','point16','fixed64')
class Model(nn.Module):
 def __init__(self,seed):
  super().__init__();torch.manual_seed(seed);self.a=nn.Linear(1,32);self.b=nn.Linear(32,1);nn.init.xavier_normal_(self.a.weight);nn.init.zeros_(self.a.bias);nn.init.normal_(self.b.weight,std=.04);nn.init.zeros_(self.b.bias)
 def forward(self,x):return x+x*(1-x)*self.b(torch.tanh(self.a(2*x-1)))
def exact(x):return (torch.exp((x-1)/EPS)-math.exp(-1/EPS))/(1-math.exp(-1/EPS))
def residual(m,points):
 x=points.detach().requires_grad_();u=m(x);g=torch.autograd.grad(u,x,torch.ones_like(u),create_graph=True)[0];gg=torch.autograd.grad(g,x,torch.ones_like(g),create_graph=True)[0];return EPS*gg-g

def run(kind,seed,steps,cap):
 model=Model(seed);n=64 if kind=='fixed64' else 16;x=((torch.arange(n)+.5)/n).reshape(-1,1);lam=nn.Parameter(torch.ones(1 if kind=='shared16' else n),requires_grad=kind in ('shared16','point16'));opt=torch.optim.Adam(model.parameters(),lr=.003);ascent=torch.optim.Adam([lam],lr=.005,maximize=True) if kind in ('shared16','point16') else None;grid=torch.linspace(0,1,1001).reshape(-1,1);truth=exact(grid);held=((torch.arange(997)+.37)/997).reshape(-1,1);initial={k:v.detach().tolist() for k,v in model.state_dict().items()};frames=[];start=time.perf_counter()
 def record(step):
  with torch.no_grad():u=model(grid);weights=lam.square().expand(n);rel=float(torch.linalg.vector_norm(u-truth)/torch.linalg.vector_norm(truth))
  r=residual(model,x).detach().flatten();frames.append(dict(step=step,curve=u.flatten().tolist(),relativeL2=rel,lambdaValues=lam.detach().tolist(),weights=weights.tolist(),residual=r.tolist(),unweightedLoss=float(r.square().mean()),weightedLoss=float((weights*r.square()).mean()),meanWeight=float(weights.mean()),maxWeight=float(weights.max())))
 record(0)
 for step in range(1,steps+1):
  opt.zero_grad();
  if ascent:ascent.zero_grad()
  r=residual(model,x).flatten();loss=(lam.square()*r.square()).mean();loss.backward();opt.step()
  if ascent:ascent.step()
  if step%200==0 or step==steps:record(step)
  if time.perf_counter()-start>cap:break
 if frames[-1]['step']!=step:record(step)
 final=frames[-1];return dict(kind=kind,seed=seed,steps=step,limited=step<steps,seconds=time.perf_counter()-start,networkParameters=sum(p.numel() for p in model.parameters()),adaptiveParameters=lam.numel() if ascent else 0,initialState=initial,finalState={k:v.detach().tolist() for k,v in model.state_dict().items()},points=x.flatten().tolist(),frames=frames,relativeL2=final['relativeL2'],heldoutResidualRMS=float(residual(model,held).detach().square().mean().sqrt()),lambdaValues=lam.detach().tolist(),unweightedLoss=final['unweightedLoss'],weightedLoss=final['weightedLoss'])
def main():
 p=argparse.ArgumentParser();p.add_argument('--steps',type=int,default=2000);p.add_argument('--seeds',nargs='+',type=int,default=[11,22,33]);p.add_argument('--kinds',nargs='+',choices=KINDS,default=list(KINDS));p.add_argument('--cap',type=float,default=90);p.add_argument('--output',type=Path);a=p.parse_args()
 if a.output is None and(a.steps!=2000 or a.seeds!=[11,22,33] or a.cap!=90 or a.kinds!=list(KINDS)):p.error('Modified runs require --output new-file.json')
 torch.set_default_dtype(torch.float64);torch.set_num_threads(1);runs={}
 for seed in a.seeds:
  for k in a.kinds:
   r=run(k,seed,a.steps,a.cap);runs[f'{k}-{seed}']=r;print(k,seed,round(r['seconds'],2),round(r['relativeL2'],4),round(r['frames'][-1]['meanWeight'],3),flush=True)
 x=torch.linspace(0,1,1001).reshape(-1,1);data=dict(schema='sa-boundary-layer-cpu-v1',scope='Steady one-dimensional boundary-layer adaptation of nonnegative trainable residual masks and min-max updates. Hard endpoint ansatz,all mask lambdas initially1,Adam descent/ascent,no L-BFGS or GP interpolation. Not original Burgers/Helmholtz/Allen-Cahn benchmarks.',epsilon=EPS,x=x.flatten().tolist(),truth=exact(x).flatten().tolist(),steps=a.steps,threads=1,dtype='float64',torch=torch.__version__,python=platform.python_version(),runs=runs)
 if a.output is None:
  extra=run('fixed64',11,8000,a.cap);data['diagnostic']={'label':'Extra-budget diagnostic:fixed64 seed11,8000updates instead of2000;not part of the matched-budget comparison.','run':extra};print('Extra-budget diagnostic',extra['relativeL2'],flush=True)
 (a.output or Path(__file__).with_name('trace.json')).write_text(json.dumps(data,allow_nan=False),encoding='utf-8')
if __name__=='__main__':main()
