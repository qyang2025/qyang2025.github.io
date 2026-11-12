import importlib.util,json,math,unittest
from pathlib import Path
import numpy as np
import torch
D=Path(__file__).resolve().parent;sp=importlib.util.spec_from_file_location('hfm',D/'tracer_flow_cpu.py');m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m);torch.set_default_dtype(torch.float64);torch.set_num_threads(2);t=json.loads((D/'trace.json').read_text(encoding='utf-8'))
class Checks(unittest.TestCase):
 def test_exact_transport_and_constant_ns(self):
  q=m.points(91,torch.Generator().manual_seed(888)).requires_grad_()
  for stripe in(False,True):
   c=m.exact(q,stripe);g=torch.autograd.grad(c,q,torch.ones_like(c),create_graph=True)[0];xx=torch.autograd.grad(g[:,0].sum(),q,create_graph=True)[0][:,0];yy=torch.autograd.grad(g[:,1].sum(),q,create_graph=True)[0][:,1];r=g[:,2]+.8*g[:,0]+.35*g[:,1]-.02*(xx+yy);self.assertLess(float(r.detach().abs().max()),1e-12)
  # Constant u,v,p have zero time/space derivatives: unforced NS and continuity vanish.
  vel=torch.stack([q[:,0]*0+.8,q[:,1]*0+.35,q[:,2]*0],1)
  for i in range(3):self.assertTrue(torch.equal(torch.autograd.grad(vel[:,i].sum(),q,retain_graph=True)[0],torch.zeros_like(q)))
 def test_stripe_nonidentifiability_and_periodicity(self):
  q=m.points(43,torch.Generator().manual_seed(199));a=m.Model(11,True);b=m.Model(11,True);b.b.data.fill_(99.);np.testing.assert_allclose(m.residual(a,q).detach(),m.residual(b,q).detach(),atol=1e-14)
  for stripe in(False,True):
   model=m.Model(22,stripe);p=q.clone();p[:,0]+=2*math.pi;p[:,1]+=2*math.pi;np.testing.assert_allclose(model(q).detach(),model(p).detach(),atol=1e-12)
 def test_gradient_rank_diagnostic(self):
  q=m.points(200,torch.Generator().manual_seed(24)).requires_grad_()
  for stripe in(False,True):
   c=m.exact(q,stripe);g=torch.autograd.grad(c,q,torch.ones_like(c),create_graph=True)[0];A=g[:,:2].detach().numpy();ev=np.linalg.eigvalsh(A.T@A/len(q));self.assertGreater(ev[-1],.001)
   if stripe:self.assertEqual(ev[0],0)
   else:self.assertGreater(ev[0],.001)
 def test_all_saved_results_and_unused_velocity(self):
  held=m.points(1000,torch.Generator().manual_seed(924));axis=torch.tensor(t['x']);X,Y=torch.meshgrid(axis,axis,indexing='xy')
  for r in t['runs'].values():
   a=m.Model(r['seed'],r['kind']=='stripe');a.load_state_dict({k:torch.tensor(v) for k,v in r['finalState'].items()});pred=a(held).detach();truth=m.exact(held,a.stripe);err=float(torch.linalg.vector_norm(pred-truth)/torch.linalg.vector_norm(truth-.5));self.assertAlmostEqual(err,r['fluctuationRelativeL2'],places=11);rr=float(m.residual(a,held).detach().square().mean().sqrt());self.assertAlmostEqual(rr,r['heldoutResidualRMS'],places=11);self.assertEqual(r['steps'],2000);self.assertFalse(r['limited'])
   for i,time in enumerate(t['times']):
    q=torch.stack([X.flatten(),Y.flatten(),torch.full((X.numel(),),time)],1);np.testing.assert_allclose(a(q).detach().flatten(),r['frames'][-1]['fields'][i],atol=1e-12)
   if r['kind']=='data':self.assertEqual(r['a'],r['initialVelocity'][0]);self.assertEqual(r['b'],r['initialVelocity'][1])
   if r['kind']=='stripe':self.assertEqual(r['b'],r['initialVelocity'][1])
 def test_analytic_reference_in_saved_animation(self):
  for i,time in enumerate(t['times']):
   x=np.array(t['x']);X,Y=np.meshgrid(x,x,indexing='xy');c=.5+.25*np.sin(X-.8*time)*np.cos(Y-.35*time)*np.exp(-.04*time)+.08*np.cos(2*(X-.8*time))*np.sin(Y-.35*time)*np.exp(-.1*time);np.testing.assert_allclose(c.flatten(),t['truth'][i],atol=1e-12)
if __name__=='__main__':unittest.main()
