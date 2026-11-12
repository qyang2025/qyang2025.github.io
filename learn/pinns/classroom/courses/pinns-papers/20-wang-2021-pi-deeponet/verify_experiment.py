import importlib.util,json,math,sys,unittest
from pathlib import Path
import numpy as np
import torch
D=Path(__file__).resolve().parent;sys.path.insert(0,str(D));sp=importlib.util.spec_from_file_location('piop',D/'physics_operator_cpu.py');m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m);torch.set_default_dtype(torch.float64);torch.set_num_threads(1);t=json.loads((D/'trace.json').read_text())
def autodiff(model,samples,x):
 us=[];gs=[];ggs=[]
 for sample in samples:
  u=model.grid(sample[None],x).flatten();g=torch.autograd.grad(u.sum(),x,create_graph=True)[0];gg=torch.autograd.grad(g.sum(),x,create_graph=True)[0];us.append(u);gs.append(g.flatten());ggs.append(gg.flatten())
 return tuple(torch.stack(a) for a in [us,gs,ggs])
def reference(coeff,x):
 c=np.asarray(coeff);k=np.arange(1,c.shape[1]+1);return(c/(math.pi*k)**2)@np.sin(math.pi*np.asarray(x)[:,None]*k).T
class Checks(unittest.TestCase):
 def test_analytic_trunk_derivatives_and_parameter_gradients(self):
  net=m.Model('deeponet',11);samples=torch.tensor(t['sensorValues']['test'][:3]);x=torch.linspace(.07,.93,9).reshape(-1,1).requires_grad_();a=m.derivatives(net,samples,x);b=autodiff(net,samples,x)
  for av,bv in zip(a,b):np.testing.assert_allclose(av.detach(),bv.detach(),atol=1e-12,rtol=1e-11)
  ga=torch.autograd.grad(a[2].square().mean(),tuple(net.parameters()),retain_graph=True);gb=torch.autograd.grad(b[2].square().mean(),tuple(net.parameters()))
  for av,bv in zip(ga,gb):np.testing.assert_allclose(av,bv,atol=1e-10,rtol=1e-9)
 def test_paired_initial_states_labels_and_constraints(self):
  self.assertEqual(len(t['runs']),9)
  for seed in [11,22,33]:
   states=[t['runs'][f'{k}-{seed}']['initialState'] for k in m.KINDS];self.assertEqual(states[0],states[1]);self.assertEqual(states[1],states[2])
  for r in t['runs'].values():
   self.assertEqual(r['labelCount'],0 if r['kind']=='physics' else 72);self.assertEqual(r['residualConstraintsPerStep'],0 if r['kind']=='data' else 384);self.assertEqual(r['parameters'],465);self.assertEqual(r['steps'],2400);self.assertFalse(r['limited'])
   if r['kind']=='physics':self.assertTrue(all(f['trainingLabelLoss'] is None for f in r['frames']))
 def test_physics_training_never_requests_training_output_labels(self):
  original=m.exact
  def guard(coeff,x):
   if len(coeff)==len(t['coefficients']['train']):raise AssertionError('Training-output labels requested')
   return original(coeff,x)
  m.exact=guard
  try:
   result=m.run('physics',11,1,90);self.assertEqual(result['labelCount'],0)
   with self.assertRaisesRegex(AssertionError,'Training-output labels requested'):m.run('data',11,1,90)
  finally:m.exact=original
 def test_all_saved_fields_and_groups(self):
  x=torch.tensor(t['x']);samples=torch.tensor(t['sensorValues']['test'])
  for r in t['runs'].values():
   net=m.Model('deeponet',r['seed'])
   for state,frame in [('initialState',r['frames'][0]),('finalState',r['frames'][-1])]:
    net.load_state_dict({k:torch.tensor(v) for k,v in r[state].items()});np.testing.assert_allclose(net.grid(samples,x).detach()[0],frame['exampleCurve'],atol=1e-12)
   for name,g in r['groups'].items():
    inputs=torch.tensor(t['sensorValues'][name]);pred=net.grid(inputs,x).detach().numpy();ref=reference(t['coefficients'][name],t['x']);np.testing.assert_allclose(pred,g['predictions'],atol=1e-12);self.assertAlmostEqual(float(np.linalg.norm(pred-ref)/np.linalg.norm(ref)),g['relativeL2'],places=10);self.assertEqual(float(net.grid(inputs,torch.tensor([0.,1.])).detach().abs().max()),0)
 def test_heldout_residual_against_autodiff(self):
  samples=torch.tensor(t['sensorValues']['test']);coeff=torch.tensor(t['coefficients']['test']);x=((torch.arange(197)+.37)/197).reshape(-1,1).requires_grad_()
  for r in t['runs'].values():
   net=m.Model('deeponet',r['seed']);net.load_state_dict({k:torch.tensor(v) for k,v in r['finalState'].items()});uxx=autodiff(net,samples,x)[2];rr=-uxx-m.forcing(coeff,x.detach());self.assertAlmostEqual(float(rr.detach().square().mean().sqrt()),r['groups']['test']['heldoutResidualRMS'],places=10)
 def test_training_inputs_and_exact_references(self):
  d=m.datasets();sensors=torch.tensor(t['sensors'])
  for name,c in t['coefficients'].items():
   np.testing.assert_allclose(d[name],c,atol=0);np.testing.assert_allclose(t['sensorValues'][name],m.forcing(torch.tensor(c),sensors),atol=1e-14);np.testing.assert_allclose(t['truth'][name],reference(c,t['x']),atol=1e-15)
if __name__=='__main__':unittest.main()
