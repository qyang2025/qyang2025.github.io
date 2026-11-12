"""Physics-informed operator learning with an independently AD-verified analytic trunk derivative."""
import argparse,json,time,platform,math
from pathlib import Path
import torch
from operator_core import Model,forcing,exact,datasets,SCALE
KINDS=('data','physics','hybrid')
def derivatives(model,samples,x):
 x=x.reshape(-1,1);a=model.trunk[0];c=model.trunk[2];h=torch.tanh((2*x-1)@a.weight.T+a.bias);hx=(1-h*h)*(2*a.weight.T);hxx=-8*h*(1-h*h)*a.weight.T.square();T=h@c.weight.T+c.bias;Tx=hx@c.weight.T;Txx=hxx@c.weight.T;B=model.branch(samples);v=B@T.T+model.bias;vx=B@Tx.T;vxx=B@Txx.T;factor=(x*(1-x)).T;return factor*v,(1-2*x).T*v+factor*vx,-2*v+2*(1-2*x).T*vx+factor*vxx

def run(kind,seed,steps,cap):
 d=datasets();sensors=(torch.arange(9)+.5)/9;inputs=forcing(d['train'],sensors);xlabels=torch.tensor([.2,.5,.8]);labels=exact(d['train'],xlabels) if kind!='physics' else None;xp=(torch.arange(16)+.5)/16;fp=forcing(d['train'],xp);x=torch.linspace(0,1,201);truth=exact(d['test'],x);testinputs=forcing(d['test'],sensors);net=Model('deeponet',seed);opt=torch.optim.Adam(net.parameters(),lr=.003);frames=[];initial={k:v.detach().tolist() for k,v in net.state_dict().items()};start=time.perf_counter()
 def record(n):
  with torch.no_grad():
   pred=net.grid(testinputs,x);r=-derivatives(net,inputs,xp)[2]-fp;frames.append(dict(step=n,exampleCurve=pred[0].tolist(),relativeL2=float(torch.linalg.vector_norm(pred-truth)/torch.linalg.vector_norm(truth)),trainingPhysicsLoss=float(r.square().mean()),trainingLabelLoss=float(((net.grid(inputs,xlabels)-labels)/SCALE).square().mean()) if labels is not None else None))
 record(0)
 for n in range(1,steps+1):
  opt.zero_grad();loss=torch.zeros(())
  if kind!='physics':loss=loss+((net.grid(inputs,xlabels)-labels)/SCALE).square().mean()
  if kind!='data':loss=loss+(-derivatives(net,inputs,xp)[2]-fp).square().mean()
  loss.backward();opt.step()
  if n%200==0 or n==steps:record(n)
  if time.perf_counter()-start>cap:break
 if frames[-1]['step']!=n:record(n)
 groups={};held=(torch.arange(197)+.37)/197
 with torch.no_grad():
  for name,coeff in d.items():
   if name=='train':continue
   samples=forcing(coeff,sensors);pred=net.grid(samples,x);ref=exact(coeff,x);r=-derivatives(net,samples,held)[2]-forcing(coeff,held);groups[name]=dict(predictions=pred.tolist(),relativeL2=float(torch.linalg.vector_norm(pred-ref)/torch.linalg.vector_norm(ref)),perFunctionRelativeL2=(torch.linalg.vector_norm(pred-ref,dim=1)/torch.linalg.vector_norm(ref,dim=1)).tolist(),heldoutResidualRMS=float(r.square().mean().sqrt()))
  zeroMax=float(net.grid(torch.zeros(1,9),x).abs().max());a,b=testinputs[:8],testinputs[8:];mid=net.grid((a+b)/2,x);mean=(net.grid(a,x)+net.grid(b,x))/2;linearity=float(torch.linalg.vector_norm(mid-mean)/(torch.linalg.vector_norm(mean)+1e-12))
 return dict(kind=kind,seed=seed,steps=n,limited=n<steps,seconds=time.perf_counter()-start,parameters=sum(p.numel() for p in net.parameters()),labelCount=0 if labels is None else labels.numel(),residualConstraintsPerStep=0 if kind=='data' else fp.numel(),initialState=initial,finalState={k:v.detach().tolist() for k,v in net.state_dict().items()},frames=frames,groups=groups,zeroMax=zeroMax,midpointLinearityDefect=linearity)

def main():
 p=argparse.ArgumentParser();p.add_argument('--steps',type=int,default=2400);p.add_argument('--seeds',nargs='+',type=int,default=[11,22,33]);p.add_argument('--cap',type=float,default=90);p.add_argument('--output',type=Path);a=p.parse_args()
 if a.output is None and(a.steps!=2400 or a.seeds!=[11,22,33] or a.cap!=90):p.error('Modified runs require --output new-file.json')
 torch.set_default_dtype(torch.float64);torch.set_num_threads(1);runs={}
 for seed in a.seeds:
  for kind in KINDS:
   r=run(kind,seed,a.steps,a.cap);runs[f'{kind}-{seed}']=r;print(kind,seed,round(r['seconds'],2),round(r['groups']['test']['relativeL2'],4),round(r['groups']['test']['heldoutResidualRMS'],4),flush=True)
 d=datasets();x=torch.linspace(0,1,201);sensors=(torch.arange(9)+.5)/9;data=dict(schema='pi-deeponet-poisson-cpu-v1',scope='Tiny Poisson operator teaching adaptation. Same465-parameter nonlinear-branch DeepONet,hard zero endpoints,and paired initial states. Data72,physics0,and hybrid72label controls;24training functions and16collocation locations each. Analytic smooth-trunk derivatives are independently checked against automatic differentiation. No original GRF/Burgers/Eikonal benchmark or arbitrary-input generalisation claim.',x=x.tolist(),sensors=sensors.tolist(),xLabels=[.2,.5,.8],xResidual=((torch.arange(16)+.5)/16).tolist(),coefficients={k:v.tolist() for k,v in d.items()},sensorValues={k:forcing(v,sensors).tolist() for k,v in d.items()},forcing={k:forcing(v,x).tolist() for k,v in d.items()},truth={k:exact(v,x).tolist() for k,v in d.items()},trainingScale=SCALE,steps=a.steps,threads=1,dtype='float64',torch=torch.__version__,python=platform.python_version(),runs=runs);(a.output or Path(__file__).with_name('trace.json')).write_text(json.dumps(data,allow_nan=False),encoding='utf-8')
if __name__=='__main__':main()
