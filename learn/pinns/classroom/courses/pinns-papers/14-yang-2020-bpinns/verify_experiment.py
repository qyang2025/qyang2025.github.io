import importlib.util,json,math,unittest,warnings
from pathlib import Path
import numpy as np
import torch
D=Path(__file__).resolve().parent;s=importlib.util.spec_from_file_location('bp',D/'bpinn_nuts_cpu.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);torch.set_default_dtype(torch.float64);torch.set_num_threads(1);t=json.loads((D/'trace.json').read_text())
class Checks(unittest.TestCase):
 def test_analytic_derivatives(self):
  q=torch.randn(11);x=torch.linspace(.03,.97,31).requires_grad_();u,ux,uxx=m.field(q,x);g=torch.autograd.grad(u.sum(),x,create_graph=True)[0];gg=torch.autograd.grad(g.sum(),x)[0];np.testing.assert_allclose(ux.detach(),g.detach(),atol=1e-12);np.testing.assert_allclose(uxx.detach(),gg,atol=1e-12);self.assertEqual(float(m.field(q,torch.tensor([0.,1.]))[0].abs().max()),0)
 def test_potential_and_whitened_gradient(self):
  d=m.observations('low');q=torch.tensor(t['cases']['low']['chains'][0]['initial'],requires_grad=True);xu=np.array(d['xu']);xf=np.array(d['xf']);uq=m.field(q,torch.tensor(xu))[0].detach().numpy();fq=-np.exp(float(q[10].detach()))*m.field(q,torch.tensor(xf))[2].detach().numpy();expected=.5*np.sum((q.detach().numpy()/np.array(t['priorScales']))**2)+.5*np.sum(((uq-d['u'])/d['sigmaU'])**2)+.5*np.sum(((fq-d['f'])/d['sigmaF'])**2);self.assertAlmostEqual(float(m.potential(q,d).detach()),expected,places=8)
  W=torch.tensor(t['cases']['low']['chains'][0]['whitening']);z=torch.randn(11)*.01;init=q.detach();self.assertGreater(abs(float(torch.linalg.det(W))),0)
  with warnings.catch_warnings():warnings.simplefilter('ignore');jit=torch.jit.trace(lambda v:m.potential(init+W@v,d),z)
  a=z.clone().requires_grad_();b=z.clone().requires_grad_();np.testing.assert_allclose(torch.autograd.grad(jit(a),a)[0],torch.autograd.grad(m.potential(init+W@b,d),b)[0],atol=1e-8)
 def test_saved_posterior_summaries(self):
  for case,c in t['cases'].items():
   self.assertEqual(len(c['chains']),4);q=torch.tensor([r['samples'] for r in c['chains']]);k=q[:,:,10].exp();self.assertEqual(tuple(q.shape),(4,500,11));np.testing.assert_allclose(k.flatten().quantile(torch.tensor([.025,.5,.975])),c['kQuantiles'],atol=1e-12);self.assertAlmostEqual(float(m.split_gelman_rubin(k)),c['kRhat'],places=12);self.assertAlmostEqual(float(m.effective_sample_size(k)),c['kESS'],places=10);curves=torch.stack([m.field(v,torch.tensor(t['x']))[0] for v in q.flatten(0,1)]);np.testing.assert_allclose(curves.mean(0),c['mean'],atol=1e-12);np.testing.assert_allclose(curves.quantile(torch.tensor([.025,.975]),dim=0),[c['lower'],c['upper']],atol=1e-12);self.assertEqual(sum(len(r['divergences']) for r in c['chains']),0)
 def test_noise_and_diagnostic_limits(self):
  lo,hi=t['cases']['low'],t['cases']['high'];np.testing.assert_allclose(lo['data']['standardNoiseU'],hi['data']['standardNoiseU']);self.assertGreater(hi['kQuantiles'][2]-hi['kQuantiles'][0],lo['kQuantiles'][2]-lo['kQuantiles'][0]);self.assertGreater(max(lo['weightRhats']),2);self.assertGreater(lo['kRhat'],1.01);self.assertEqual(lo['frames'][-1]['drawsPerChain'],500)
if __name__=='__main__':unittest.main()
