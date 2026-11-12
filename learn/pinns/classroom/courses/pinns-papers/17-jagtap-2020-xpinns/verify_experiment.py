import importlib.util,json,math,unittest
from pathlib import Path
import numpy as np
import torch
D=Path(__file__).resolve().parent;s=importlib.util.spec_from_file_location('xp',D/'time_slab_cpu.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);torch.set_default_dtype(torch.float64);torch.set_num_threads(1)
class Checks(unittest.TestCase):
 def test_exact_heat_equation_and_hard_conditions(self):
  q=m.points(41,0,1,torch.Generator().manual_seed(77)).requires_grad_();u=m.exact(q);g=torch.autograd.grad(u,q,torch.ones_like(u),create_graph=True)[0];xx=torch.autograd.grad(g[:,0].sum(),q)[0][:,0:1];self.assertLess(float((g[:,1:2]-.1*xx).detach().abs().max()),1e-12)
  x=torch.linspace(0,1,37);q0=torch.stack([x,x*0],1)
  for kind in m.KINDS:
   net=m.Model(kind,11);np.testing.assert_allclose(net.field(q0,0).detach().flatten(),np.sin(math.pi*x.numpy()),atol=1e-14)
   for slab in [0,1]:
    p=torch.tensor([[0.,.2],[1.,.7]]);self.assertLess(float(net.field(p,slab).detach().abs().max()),1e-14)
 def test_derivatives_against_finite_differences(self):
  net=m.Model('xpinn',22)
  for slab,time in [(0,.2),(1,.8)]:
   q=torch.tensor([[.23,time],[.61,time]]);u,ux,r=m.derivatives(net,q,slab);dx=torch.tensor([[1e-4,0.]]);dt=torch.tensor([[0.,1e-5]]);uxx=(net.field(q+dx,slab)-2*net.field(q,slab)+net.field(q-dx,slab))/1e-8;ut=(net.field(q+dt,slab)-net.field(q-dt,slab))/2e-5;np.testing.assert_allclose(r.detach(),(ut-.1*uxx).detach(),atol=1e-6,rtol=1e-5)
 def test_average_loss_and_missing_information(self):
  a=torch.randn(16,requires_grad=True);b=torch.randn(16,requires_grad=True);av=(a+b)/2;loss=((a-av)**2+(b-av)**2).mean();self.assertAlmostEqual(float(loss.detach()),float(((a-b)**2/2).mean().detach()),places=12);ga,gb=torch.autograd.grad(loss,(a,b));np.testing.assert_allclose(ga.detach(),((a-b)/16).detach(),atol=1e-14);np.testing.assert_allclose(gb.detach(),((b-a)/16).detach(),atol=1e-14)
  # Exact heat solution and zero field both have zero PDE residual,but disagree at a time interface.
  x=(torch.arange(16)+.5)/16;u=torch.sin(math.pi*x)*math.exp(-.1*math.pi**2*.5);self.assertGreater(float(u.square().mean().sqrt()),.4)
 def test_saved_checkpoints_and_all_metrics(self):
  t=json.loads((D/'trace.json').read_text());self.assertEqual(len(t['runs']),12);x=torch.tensor(t['x']);times=torch.tensor(t['times']);mesh=torch.stack([x.repeat(5),times.repeat_interleave(len(x))],1);truth=m.exact(mesh)
  for r in t['runs'].values():
   net=m.Model(r['kind'],r['seed']);self.assertEqual(r['steps'],2000);self.assertFalse(r['limited']);self.assertEqual(r['parameters'],193 if r['kind']=='global' else 194)
   for state,frame in [('initialState',r['frames'][0]),('finalState',r['frames'][-1])]:
    net.load_state_dict({k:torch.tensor(v) for k,v in r[state].items()});np.testing.assert_allclose(net(mesh).detach().reshape(5,len(x)),frame['fields'],atol=1e-12)
   q=torch.tensor(r['interfacePoints']);a,_,ra=m.derivatives(net,q,0);b,_,rb=m.derivatives(net,q,1);self.assertAlmostEqual(float((a-b).detach().square().mean().sqrt()),r['valueJumpRMS'],places=12);self.assertAlmostEqual(float((ra-rb).detach().square().mean().sqrt()),r['residualJumpRMS'],places=12);self.assertAlmostEqual(float((torch.linalg.vector_norm(net(mesh)-truth)/torch.linalg.vector_norm(truth)).detach()),r['relativeL2'],places=12)
   vx=np.linspace(0,1,201);vt=np.linspace(0,1,101);X,T=np.meshgrid(vx,vt);vmesh=torch.tensor(np.column_stack([X.ravel(),T.ravel()]));reference=np.sin(math.pi*X)*np.exp(-.1*math.pi**2*T);prediction=net(vmesh).detach().numpy().reshape(reference.shape);self.assertAlmostEqual(float(np.linalg.norm(prediction-reference)/np.linalg.norm(reference)),r['validationRelativeL2'],places=12)
   held=[m.points(389,0,.5,torch.Generator().manual_seed(824)),m.points(389,.5,1,torch.Generator().manual_seed(825))];rs=torch.cat([m.derivatives(net,q,i)[2].detach() for i,q in enumerate(held)]);self.assertAlmostEqual(float(rs.square().mean().sqrt()),r['heldoutResidualRMS'],places=12)
 def test_paired_controls_and_no_interface_labels(self):
  t=json.loads((D/'trace.json').read_text())
  for seed in [11,22,33]:
   base=t['runs'][f'uncoupled-{seed}']
   for kind in ['value','xpinn']:
    r=t['runs'][f'{kind}-{seed}'];self.assertEqual(base['initialState'],r['initialState']);self.assertEqual(base['residualPoints'],r['residualPoints']);self.assertEqual(base['interfacePoints'],r['interfacePoints'])
if __name__=='__main__':unittest.main()
