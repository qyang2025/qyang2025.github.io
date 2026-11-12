import importlib.util,json,math,unittest
from pathlib import Path
import numpy as np
import torch
D=Path(__file__).resolve().parent;s=importlib.util.spec_from_file_location('sa',D/'soft_attention_cpu.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);torch.set_default_dtype(torch.float64);torch.set_num_threads(1);t=json.loads((D/'trace.json').read_text())
class Checks(unittest.TestCase):
 def test_analytic_equation_and_hard_boundaries(self):
  x=torch.linspace(0,1,111).reshape(-1,1).requires_grad_();u=m.exact(x);ux=torch.autograd.grad(u,x,torch.ones_like(u),create_graph=True)[0];uxx=torch.autograd.grad(ux,x,torch.ones_like(ux))[0];self.assertLess(float((m.EPS*uxx-ux).detach().abs().max()),1e-12)
  self.assertLess(float(m.residual(m.exact,x.detach()).detach().abs().max()),1e-12)
  for seed in [11,22,33]:np.testing.assert_allclose(m.Model(seed)(torch.tensor([[0.],[1.]])).detach().flatten(),[0,1],atol=1e-14)
 def test_mask_ascent_gradient(self):
  r=torch.tensor([.2,.5,1.]);lam=torch.tensor([1.,2.,3.],requires_grad=True);loss=(lam.square()*r.square()).mean();g=torch.autograd.grad(loss,lam)[0];np.testing.assert_allclose(g,2*lam.detach()*r.square()/3,atol=1e-14);self.assertTrue(bool((g>0).all()));shared=torch.tensor([2.],requires_grad=True);gg=torch.autograd.grad((shared.square()*r.square()).mean(),shared)[0];self.assertAlmostEqual(float(gg),4*float(r.square().mean()),places=14)
 def test_unseen_residual_counterexample(self):
  x=((torch.arange(16)+.5)/16).reshape(-1,1).requires_grad_();bump=lambda z:1e12*torch.clamp((z-.49)*(.51-z),min=0)**3;u=bump(x);g=torch.autograd.grad(u,x,torch.ones_like(u),create_graph=True)[0];gg=torch.autograd.grad(g,x,torch.ones_like(g))[0];self.assertEqual(float((m.EPS*gg-g).detach().abs().max()),0);self.assertAlmostEqual(float(bump(torch.tensor([[.5]]))),1.,places=12);self.assertEqual(float(bump(torch.tensor([[0.],[1.]])).abs().max()),0)
 def test_saved_fields_losses_and_holdout(self):
  self.assertEqual(len(t['runs']),12);x=torch.tensor(t['x']).reshape(-1,1);reference=(np.exp((x.numpy()-1)/.025)-np.exp(-40))/(1-np.exp(-40));held=((torch.arange(997)+.37)/997).reshape(-1,1)
  for r in list(t['runs'].values())+[t['diagnostic']['run']]:
   net=m.Model(r['seed']);self.assertIn(r['steps'],[2000,8000]);self.assertFalse(r['limited']);self.assertEqual(r['networkParameters'],97)
   for name,frame in [('initialState',r['frames'][0]),('finalState',r['frames'][-1])]:
    net.load_state_dict({k:torch.tensor(v) for k,v in r[name].items()});np.testing.assert_allclose(net(x).detach().flatten(),frame['curve'],atol=1e-12)
   pred=net(x).detach().numpy();self.assertAlmostEqual(float(np.linalg.norm(pred-reference)/np.linalg.norm(reference)),r['relativeL2'],places=11);points=torch.tensor(r['points']).reshape(-1,1);rr=m.residual(net,points).detach().flatten();lam=torch.tensor(r['lambdaValues']);self.assertTrue(bool((lam>=1).all()));self.assertAlmostEqual(float(rr.square().mean()),r['unweightedLoss'],places=12);self.assertAlmostEqual(float((lam.square()*rr.square()).mean()),r['weightedLoss'],places=10);self.assertAlmostEqual(float(m.residual(net,held).detach().square().mean().sqrt()),r['heldoutResidualRMS'],places=12)
 def test_paired_initial_states_and_fixed_locations(self):
  for seed in [11,22,33]:
   base=t['runs'][f'fixed16-{seed}'];
   for kind in m.KINDS:self.assertEqual(t['runs'][f'{kind}-{seed}']['initialState'],base['initialState'])
   for kind in ['shared16','point16']:self.assertEqual(t['runs'][f'{kind}-{seed}']['points'],base['points'])
   for r in [t['runs'][f'{k}-{seed}'] for k in m.KINDS]:self.assertEqual(len(r['points']),64 if r['kind']=='fixed64' else 16)
if __name__=='__main__':unittest.main()
