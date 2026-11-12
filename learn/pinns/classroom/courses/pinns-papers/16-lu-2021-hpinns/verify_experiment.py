import importlib.util,json,math,unittest
from pathlib import Path
import numpy as np
import torch
D=Path(__file__).resolve().parent;s=importlib.util.spec_from_file_location('hd',D/'thermal_design_cpu.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);torch.set_default_dtype(torch.float64);torch.set_num_threads(1);t=json.loads((D/'trace.json').read_text())
class Checks(unittest.TestCase):
 def test_uniform_exact_solution(self):
  x,u,j,v=m.fv(math.log(.4/.6),0,1024);np.testing.assert_allclose(u,x*(1-x)/(2*.92),atol=1e-11);self.assertAlmostEqual(j,1/(12*.92),places=6);self.assertAlmostEqual(v,.4,places=12)
 def test_variable_conductivity_independent_flux_integral(self):
  x=(np.arange(100000)+.5)/100000
  for d0,d1 in [(-.7,2.1),(.2,-3.4),(-.4,0)]:
   k=.2+1.8/(1+np.exp(-(d0+d1*np.cos(2*np.pi*x))));expected=np.mean((.5-x)**2/k);_,u,j,_=m.fv(d0,d1,4096);self.assertLess(abs(j-expected),1e-7);self.assertGreaterEqual(u.min(),0)
 def test_hard_constraints_and_gradients(self):
  net=m.Design(11);self.assertEqual(float(net(torch.tensor([[0.],[1.]])).detach().abs().max()),0);x=torch.linspace(.02,.98,41).reshape(-1,1);self.assertTrue(bool((net.density(x)>0).all() and (net.density(x)<1).all()));r=m.residual(net,x);loss=r.square().mean();g=torch.autograd.grad(loss,net.d)[0].detach().numpy();base=net.d.detach().clone();fd=[]
  for i in range(2):
   vals=[]
   for h in [-1e-5,1e-5]:
    with torch.no_grad():net.d.copy_(base);net.d[i]+=h
    vals.append(float(m.residual(net,x).detach().square().mean()))
   fd.append((vals[1]-vals[0])/2e-5)
  np.testing.assert_allclose(g,fd,rtol=1e-5,atol=1e-7)
 def test_saved_final_checkpoints(self):
  self.assertEqual(len(t['runs']),9)
  for r in t['runs'].values():
   net=m.Design(r['seed']);net.load_state_dict({k:torch.tensor(v) for k,v in r['finalParameters'].items()});f=r['frames'][-1];grid=torch.tensor(t['x']).reshape(-1,1);np.testing.assert_allclose(net(grid).detach().flatten(),f['curve'],atol=1e-12);d=net.d.detach();_,_,j,v=m.fv(float(d[0]),float(6*torch.tanh(d[1])));self.assertAlmostEqual(j,r['physicalObjective'],places=12);self.assertAlmostEqual(v,r['volume'],places=12);held=((torch.arange(389)+.37)/389).reshape(-1,1);self.assertAlmostEqual(float(m.residual(net,held).detach().square().mean().sqrt()),r['heldoutResidualRMS'],places=12);self.assertEqual(r['steps'],3000);self.assertFalse(r['limited']);self.assertEqual(r['parameters'],75)
 def test_honest_outcomes_and_reference(self):
  for r in t['runs'].values():
   if r['kind']=='weak':self.assertLess(r['neuralObjective'],.001);self.assertGreater(r['physicalObjective'],.06)
   self.assertLess(abs(r['volume']-.4),.005)
  self.assertEqual(len(t['reference']['rows']),121);self.assertEqual(t['reference']['best'],min(t['reference']['rows'],key=lambda r:r['objective']))
if __name__=='__main__':unittest.main()
