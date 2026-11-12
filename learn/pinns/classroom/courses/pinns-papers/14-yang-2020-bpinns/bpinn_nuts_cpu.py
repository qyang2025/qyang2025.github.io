"""Tiny full-BNN posterior on CPU. NUTS is an adaptive HMC variant, not a seed ensemble."""
import argparse,json,math,time,platform
from pathlib import Path
import numpy as np
import torch
import pyro
from pyro.infer.mcmc import NUTS,MCMC
from pyro.ops.stats import split_gelman_rubin,effective_sample_size
SCALES=torch.tensor([1.5]*9+[3.,1.],dtype=torch.float64)
def field(q,x):
 x=x.reshape(-1,1);w=q[:3];b=q[3:6];v=q[6:9];c=q[9];t=torch.tanh((2*x-1)*w+b);h=1-t*t
 n=c+(t*v).sum(1)/math.sqrt(3);nx=(h*(2*w)*v).sum(1)/math.sqrt(3);nxx=(-8*w*w*t*h*v).sum(1)/math.sqrt(3);z=x[:,0]
 return z*(1-z)*n,(1-2*z)*n+z*(1-z)*nx,-2*n+2*(1-2*z)*nx+z*(1-z)*nxx

def observations(case):
 g=np.random.default_rng(2026);xu=np.array([.10,.25,.40,.60,.75,.90]);xf=np.linspace(.06,.94,8);zu=g.normal(size=len(xu));zf=g.normal(size=len(xf));su,sf=(.03,.10) if case=='low' else(.10,.30)
 return dict(xu=xu.tolist(),xf=xf.tolist(),u=(np.sin(np.pi*xu)+su*zu).tolist(),f=(.7*np.pi**2*np.sin(np.pi*xf)+sf*zf).tolist(),sigmaU=su,sigmaF=sf,standardNoiseU=zu.tolist(),standardNoiseF=zf.tolist())
def potential(q,d):
 xu=torch.tensor(d['xu']);xf=torch.tensor(d['xf']);u=field(q,xu)[0];f=-torch.exp(q[10])*field(q,xf)[2]
 return .5*(q/SCALES).square().sum()+.5*((u-torch.tensor(d['u']))/d['sigmaU']).square().sum()+.5*((f-torch.tensor(d['f']))/d['sigmaF']).square().sum()
def run(case,seed,draws,warmup,cap,target_accept=.95):
 pyro.set_rng_seed(seed);d=observations(case);q=torch.nn.Parameter(torch.randn(11)*.25);opt=torch.optim.Adam([q],lr=.02);start=time.perf_counter()
 for _ in range(450):opt.zero_grad();loss=potential(q,d);loss.backward();opt.step()
 refine=torch.optim.LBFGS([q],lr=.5,max_iter=120,line_search_fn='strong_wolfe');
 def closure():refine.zero_grad();loss=potential(q,d);loss.backward();return loss
 refine.step(closure);init=q.detach().clone();hessian=torch.autograd.functional.hessian(lambda z:potential(z,d),init);ev,vec=torch.linalg.eigh((hessian+hessian.T)/2);white=vec@torch.diag(ev.clamp(min=.01).rsqrt());compiled=torch.jit.trace(lambda z:potential(init+white@z,d),torch.zeros(11),check_trace=True);kernel=NUTS(potential_fn=lambda p:compiled(p['z']),full_mass=False,target_accept_prob=target_accept,max_tree_depth=5)
 def hook(kernel,samples,stage,i):
  if time.perf_counter()-start>cap:raise TimeoutError('CPU cap exceeded')
 sampler=MCMC(kernel,num_samples=draws,warmup_steps=warmup,initial_params={'z':torch.zeros(11)},num_chains=1,hook_fn=hook,disable_progbar=True);sampler.run();latent=sampler.get_samples()['z'].detach();samples=init+latent@white.T;diag=sampler.diagnostics();return dict(targetAcceptance=target_accept,seed=seed,seconds=time.perf_counter()-start,draws=draws,warmup=warmup,initial=init.tolist(),whitening=white.tolist(),mapHessianEigenvalues=ev.tolist(),samples=samples.tolist(),stepSize=float(kernel.step_size),acceptance=diag['acceptance rate']['chain 0'],divergences=diag['divergences']['chain 0'],potentialAtInitial=float(potential(init,d)))

def summarize(case,rows,draws,grid):
 qs=torch.tensor([r['samples'] for r in rows]);ks=qs[:,:,10].exp();us=torch.stack([field(q,grid)[0] for q in qs.flatten(0,1)]);mean=us.mean(0);quant=us.quantile(torch.tensor([.025,.975]),dim=0);kquant=ks.flatten().quantile(torch.tensor([.025,.5,.975]));ess=float(effective_sample_size(ks));rhat=float(split_gelman_rubin(ks));frames=[]
 for n in range(50,draws+1,50):
  prefix=qs[:,:n].flatten(0,1);curves=torch.stack([field(q,grid)[0] for q in prefix]);qt=curves.quantile(torch.tensor([.025,.975]),dim=0);frames.append(dict(drawsPerChain=n,mean=curves.mean(0).tolist(),lower=qt[0].tolist(),upper=qt[1].tolist(),kMean=float(prefix[:,10].exp().mean())))
 return dict(data=observations(case),chains=rows,kMean=float(ks.mean()),kQuantiles=kquant.tolist(),kRhat=rhat,kESS=ess,weightRhats=split_gelman_rubin(qs).tolist(),centreRhat=float(split_gelman_rubin(torch.stack([field(q,torch.tensor([.5]))[0][0] for q in qs.flatten(0,1)]).reshape(len(rows),draws))),mean=mean.tolist(),lower=quant[0].tolist(),upper=quant[1].tolist(),relativeL2=float(torch.linalg.vector_norm(mean-torch.sin(math.pi*grid))/torch.linalg.vector_norm(torch.sin(math.pi*grid))),referenceCoverage=float(((torch.sin(math.pi*grid)>=quant[0])&(torch.sin(math.pi*grid)<=quant[1])).double().mean()),frames=frames)

def main():
 p=argparse.ArgumentParser();p.add_argument('--draws',type=int,default=500);p.add_argument('--warmup',type=int,default=400);p.add_argument('--seeds',type=int,nargs='+',default=[11,22,33,44]);p.add_argument('--cases',nargs='+',choices=['low','high'],default=['low','high']);p.add_argument('--cap',type=float,default=90);p.add_argument('--output',type=Path);a=p.parse_args()
 if a.output is None and(a.draws!=500 or a.warmup!=400 or a.seeds!=[11,22,33,44] or a.cases!=['low','high'] or a.cap!=90):p.error('Modified runs require --output new-file.json')
 torch.set_default_dtype(torch.float64);torch.set_num_threads(1);grid=torch.linspace(0,1,151);cases={}
 for case in a.cases:
  rows=[]
  for seed in a.seeds:
   try:r=run(case,seed,a.draws,a.warmup,a.cap)
   except TimeoutError:
    r=run(case,seed,a.draws,a.warmup,2*a.cap,.99);r['previousFailure']='Initial attempt exceeded CPU cap; retry uses twice the cap and target acceptance .99'
   if r['divergences']:
    previous=r;r=run(case,seed,a.draws,a.warmup,2*a.cap,.99);r['previousAttempt']=previous
   rows.append(r);print(case,seed,round(r['seconds'],2),r['acceptance'],len(r['divergences']),flush=True)
  cases[case]=summarize(case,rows,a.draws,grid)
 out=a.output or Path(__file__).with_name('trace.json');out.write_text(json.dumps(dict(schema='bpinn-cpu-v1',scope='Teaching adaptation: full11-dimensional BNN/log-diffusivity posterior, hard endpoints, known Gaussian sensor noise and sequential NUTS chains in fixed affine whitened coordinates. No Gaussian posterior approximation. Not original wide BNN, VI or dropout benchmark reproduction.',x=grid.tolist(),truth=torch.sin(math.pi*grid).tolist(),trueDiffusivity=.7,priorScales=SCALES.tolist(),draws=a.draws,warmup=a.warmup,threads=1,dtype='float64',pyro=pyro.__version__,torch=torch.__version__,python=platform.python_version(),cases=cases),allow_nan=False),encoding='utf-8')
 print([(k,v['kMean'],v['kQuantiles'],v['kRhat'],v['kESS'],v['relativeL2']) for k,v in cases.items()],flush=True)
if __name__=='__main__':main()
