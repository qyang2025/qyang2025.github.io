"""Paper 02: joint identification of Burgers coefficients from scattered observations.
Independent small CPU adaptation of Raissi et al. (2017), Part II, section 2.1.
Not a reproduction of the original low-viscosity benchmark or its reported errors.
Run: python burgers_inverse_cpu.py --seconds 90 --output trace-new.json
"""
import argparse, json, math, platform, time
from pathlib import Path
import numpy as np
import torch
from torch import nn
import torch.nn.functional as F
TRUE_A,TRUE_B,T_END=1.0,0.05,0.5
INIT_A,INIT_B=0.5,0.1

def reference(x,t,a=TRUE_A,b=TRUE_B,n=96):
    x,t=np.broadcast_arrays(np.asarray(x,dtype=float),np.asarray(t,dtype=float))
    z,w=np.polynomial.hermite.hermgauss(n)
    y=x[...,None]+np.sqrt(4*b*t[...,None])*z
    exponent=-a*np.cos(math.pi*y)/(2*math.pi*b)
    exponent-=exponent.max(axis=-1,keepdims=True)
    weights=np.exp(exponent)*w
    return -(np.sin(math.pi*y)*weights).sum(-1)/weights.sum(-1)

def reference_torch(q,a=TRUE_A,b=TRUE_B,n=96):
    z,w=np.polynomial.hermite.hermgauss(n)
    z,w=torch.tensor(z),torch.tensor(w)
    y=q[:,0:1]+torch.sqrt(4*b*q[:,1:2])*z
    exponent=-a*torch.cos(math.pi*y)/(2*math.pi*b)
    weights=torch.exp(exponent-exponent.max(dim=1,keepdim=True).values)*w
    return -(torch.sin(math.pi*y)*weights).sum(1,keepdim=True)/weights.sum(1,keepdim=True)

def derivatives(field,xt):
    q=xt.detach().clone().requires_grad_(True)
    u=field(q)
    du=torch.autograd.grad(u,q,torch.ones_like(u),create_graph=True)[0]
    ux,ut=du[:,0:1],du[:,1:2]
    uxx=torch.autograd.grad(ux,q,torch.ones_like(ux),create_graph=True)[0][:,0:1]
    return u,ut,ux,uxx

class InversePINN(nn.Module):
    def __init__(self):
        super().__init__()
        self.net=nn.Sequential(nn.Linear(2,24),nn.Tanh(),nn.Linear(24,24),nn.Tanh(),nn.Linear(24,24),nn.Tanh(),nn.Linear(24,1))
        self.lambda1=nn.Parameter(torch.tensor(INIT_A))
        self.beta=nn.Parameter(torch.tensor(math.log(math.expm1(INIT_B))))
    @property
    def lambda2(self):return F.softplus(self.beta)
    def forward(self,q):return self.net(torch.stack((q[:,0],2*q[:,1]/T_END-1),1))

def losses(model,xy,y,use_physics=True):
    data=((model(xy)-y)**2).mean()
    if use_physics:
        u,ut,ux,uxx=derivatives(model,xy)
        residual=ut+model.lambda1*u*ux-model.lambda2*uxx
        physics=(residual**2).mean()
    else:physics=torch.zeros(())
    return data+physics,data,physics

def run(kind,observations,grid,truth,seconds):
    torch.manual_seed(11);model=InversePINN()
    xy=torch.tensor(np.column_stack((observations['x'],observations['t'])))
    y=torch.tensor(observations['noisy' if kind=='noisy' else 'clean']).reshape(-1,1)
    use_physics=kind!='data-only'
    # Verify the dependency: labels alone cannot produce a coefficient gradient.
    initial,_,_=losses(model,xy,y,use_physics)
    coefficient_gradients=torch.autograd.grad(initial,(model.lambda1,model.beta),allow_unused=True)
    gradient_check=[None if v is None else float(v) for v in coefficient_gradients]
    if use_physics:assert all(v is not None and abs(v)>0 for v in gradient_check)
    else:assert gradient_check==[None,None]
    frame_list=[];start=time.perf_counter();calls=0;phase='adam';limited=False
    def evaluate_loss():
        nonlocal calls
        calls+=1;return losses(model,xy,y,use_physics)
    def record(step):
        with torch.no_grad():prediction=model(grid).numpy().reshape(truth.shape)
        _,ld,lf=evaluate_loss()
        frame_list.append({'step':step,'phase':phase,'seconds':time.perf_counter()-start,'lambda1':float(model.lambda1.detach()),'lambda2':float(model.lambda2.detach()),'dataMSE':float(ld.detach()),'physicsMSE':float(lf.detach()),'relativeL2':float(np.linalg.norm(prediction-truth)/np.linalg.norm(truth)),'curve':prediction[-1].tolist()})
    record(0);opt=torch.optim.Adam(model.parameters(),lr=.001)
    for step in range(1,2401):
        if time.perf_counter()-start>seconds*.65:limited=True;break
        opt.zero_grad();objective,_,_=evaluate_loss();objective.backward();opt.step()
        if step%200==0:record(step)
    record(step);phase='lbfgs';opt=torch.optim.LBFGS(model.parameters(),max_iter=300,history_size=30,line_search_fn='strong_wolfe',tolerance_grad=1e-8,tolerance_change=1e-12)
    def closure():
        if time.perf_counter()-start>seconds:raise TimeoutError('CPU training budget reached')
        opt.zero_grad();objective,_,_=evaluate_loss();objective.backward();return objective
    try:opt.step(closure)
    except TimeoutError:limited=True
    record(step);elapsed=time.perf_counter()-start
    with torch.no_grad():prediction=model(grid).numpy().reshape(truth.shape)
    gen=torch.Generator().manual_seed(97);heldout=torch.rand((512,2),generator=gen);heldout[:,0]=2*heldout[:,0]-1;heldout[:,1]=.02+(T_END-.02)*heldout[:,1]
    u,ut,ux,uxx=derivatives(model,heldout)
    heldout_residual=float(((ut+model.lambda1*u*ux-model.lambda2*uxx)**2).mean().detach())
    a,b=float(model.lambda1.detach()),float(model.lambda2.detach())
    return {'kind':kind,'parameters':sum(p.numel() for p in model.parameters()),'seconds':elapsed,'budgetLimited':limited,'objectiveCalls':calls,'initialCoefficientGradients':gradient_check,'lambda1':a,'lambda2':b,'lambda1RelativeError':abs(a-TRUE_A)/abs(TRUE_A),'lambda2RelativeError':abs(b-TRUE_B)/abs(TRUE_B),'relativeL2':float(np.linalg.norm(prediction-truth)/np.linalg.norm(truth)),'maxAbsError':float(np.max(np.abs(prediction-truth))),'heldoutResidualMSE':heldout_residual,'frames':frame_list,'field':prediction.tolist()}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--seconds',type=float,default=90);parser.add_argument('--noise',type=float,default=.01);parser.add_argument('--output',default=str(Path(__file__).with_name('trace.json')));args=parser.parse_args()
    if not 0<=args.noise<=.1:parser.error('Use noise fraction between 0 and 0.1.')
    if not 1<=args.seconds<=300:parser.error('Use a per-run budget between 1 and 300 seconds.')
    torch.set_num_threads(4);torch.set_default_dtype(torch.float64)
    rng=np.random.default_rng(23);x=rng.uniform(-1,1,256);t=rng.uniform(.02,T_END,256);clean=reference(x,t)
    sigma=args.noise*float(np.std(clean));noise=np.random.default_rng(71).normal(0,sigma,len(x));noisy=clean+noise
    observations={'x':x.tolist(),'t':t.tolist(),'clean':clean.tolist(),'noisy':noisy.tolist(),'noiseStd':sigma,'noiseFractionOfCleanStd':args.noise,'samplingSeed':23,'noiseSeed':71}
    xs=np.linspace(-1,1,81);times=np.linspace(0,T_END,21);xx,tt=np.meshgrid(xs,times);truth=reference(xx,tt)
    difference=float(np.max(np.abs(truth-reference(xx,tt,n=160))));assert difference<1e-7
    assert np.max(np.abs(reference(xs,0)+np.sin(math.pi*xs)))<1e-12
    assert np.max(np.abs(reference(np.array([-1.,1.])[:,None],times[None,:])))<1e-12
    probe=torch.tensor(np.column_stack((x[:32],t[:32])))
    u,ut,ux,uxx=derivatives(reference_torch,probe)
    oracle_max=float((ut+TRUE_A*u*ux-TRUE_B*uxx).abs().max().detach());assert oracle_max<1e-7
    matrix=torch.cat((u*ux,-uxx),dim=1).detach();oracle=torch.linalg.lstsq(matrix,-ut.detach()).solution
    assert torch.allclose(oracle.flatten(),torch.tensor([TRUE_A,TRUE_B]),atol=1e-7)
    grid=torch.tensor(np.stack((xx.ravel(),tt.ravel()),1))
    alternatives=[{'lambda1':a,'lambda2':b,'curve':reference(xs,T_END,a,b).tolist(),'centerObservations':reference(np.zeros_like(times),times,a,b).tolist()} for a,b in [(.5,.02),(TRUE_A,TRUE_B),(1.5,.1)]]
    assert max(abs(y) for case in alternatives for y in case['centerObservations'])<1e-12
    result={'paper':'https://arxiv.org/abs/1711.10566','scope':'Independent CPU method adaptation: increased viscosity, shorter time window, smaller network and observations; not the paper benchmark. Truth is used only for synthetic generation and evaluation, never in the fitting objective.','config':{'trueLambda1':TRUE_A,'trueLambda2':TRUE_B,'initialLambda1':INIT_A,'initialLambda2':INIT_B,'timeEnd':T_END,'networkSeed':11,'layers':[2,24,24,24,1],'observations':256,'physicsPoints':256,'physicsAtObservationCoordinates':True,'separateInitialBoundaryTrainingLabels':False,'threads':4,'dtype':'float64','perRunTrainingCapSeconds':args.seconds,'torch':torch.__version__,'numpy':np.__version__,'python':platform.python_version()},'reference':{'method':'Cole-Hopf Gauss-Hermite quadrature','nodes':96,'refinementMaxDifference':difference,'oraclePDEMaxResidual':oracle_max,'oracleCoefficientDiagnostic':oracle.flatten().tolist(),'oracleFeatureCondition':float(torch.linalg.cond(matrix)),'diagnosticOnly':'Oracle derivatives test implementation correctness; they are not used for fitting coefficients.'},'observations':observations,'x':xs.tolist(),'times':times.tolist(),'truth':truth.tolist(),'alternatives':alternatives,'runs':{}}
    for kind in ['clean','noisy','data-only']:
        result['runs'][kind]=run(kind,observations,grid,truth,args.seconds);r=result['runs'][kind]
        print(json.dumps({k:r[k] for k in ['kind','parameters','seconds','lambda1','lambda2','lambda1RelativeError','lambda2RelativeError','relativeL2','heldoutResidualMSE','budgetLimited']}),flush=True)
        Path(args.output).write_text(json.dumps(result),encoding='utf-8')
if __name__=='__main__':main()
