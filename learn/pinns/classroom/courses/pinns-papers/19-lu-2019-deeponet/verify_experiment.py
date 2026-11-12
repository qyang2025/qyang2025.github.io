import importlib.util,json,math,unittest
from pathlib import Path
import numpy as np
import torch
D=Path(__file__).resolve().parent;sp=importlib.util.spec_from_file_location('op',D/'operator_cpu.py');m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m);torch.set_default_dtype(torch.float64);torch.set_num_threads(1);t=json.loads((D/'trace.json').read_text())
def truth(c,x):
 c=np.asarray(c);k=np.arange(1,c.shape[1]+1);return(c/(math.pi*k)**2)@np.sin(math.pi*np.asarray(x)[:,None]*k).T
class Checks(unittest.TestCase):
 def test_exact_poisson_operator(self):
  c=torch.tensor([[.4,-.7,.2]])
  for coeff in [c,torch.tensor([[0.,0.,0.,1.]])]:
   x=torch.linspace(0,1,51).reshape(-1,1).requires_grad_();u=m.exact(coeff,x);ux=torch.autograd.grad(u.sum(),x,create_graph=True)[0];uxx=torch.autograd.grad(ux.sum(),x)[0];np.testing.assert_allclose(-uxx.flatten(),m.forcing(coeff,x.detach()).flatten(),atol=1e-13);np.testing.assert_allclose(u.detach().numpy(),truth(coeff,x.detach().flatten()),atol=1e-15)
 def test_sensor_rank_and_aliasing(self):
  x=np.array(t['sensors']);S=np.sin(math.pi*x[:,None]*np.arange(1,4));self.assertEqual(np.linalg.matrix_rank(S),3);S4=np.sin(math.pi*x[:,None]*np.arange(1,5));self.assertEqual(np.linalg.matrix_rank(S4),4);self.assertLess(np.abs(np.sin(18*math.pi*x)).max(),1e-13);self.assertGreater(abs(math.sin(18*math.pi/36)),.9)
 def test_grid_pairing_hard_boundaries_and_linear_prior(self):
  samples=torch.tensor(t['sensorValues']['test'][:3]);x=torch.linspace(0,1,17)
  for kind in m.KINDS:
   net=m.Model(kind,11);np.testing.assert_allclose(net.grid(samples,x).detach(),torch.cat([net.grid(f[None],x) for f in samples]).detach(),atol=1e-14);self.assertEqual(float(net.grid(samples,torch.tensor([0.,1.])).detach().abs().max()),0)
   if kind=='linear':
    self.assertEqual(float(net.grid(torch.zeros(1,9),x).detach().abs().max()),0);np.testing.assert_allclose(net.grid((samples[:1]+samples[1:2])/2,x).detach(),((net.grid(samples[:1],x)+net.grid(samples[1:2],x))/2).detach(),atol=1e-14)
 def test_datasets_and_all_saved_predictions(self):
  self.assertEqual(len(t['runs']),9);x=np.array(t['x']);sensors=torch.tensor(t['sensors']);data=m.datasets()
  for name,c in t['coefficients'].items():
   np.testing.assert_allclose(data[name],c,atol=0);np.testing.assert_allclose(t['truth'][name],truth(c,x),atol=1e-15);np.testing.assert_allclose(t['sensorValues'][name],m.forcing(torch.tensor(c),sensors),atol=1e-14)
  for r in t['runs'].values():
   net=m.Model(r['kind'],r['seed']);self.assertEqual(r['steps'],2400);self.assertFalse(r['limited']);self.assertEqual(r['parameters'],{'deeponet':465,'linear':240,'concat':481}[r['kind']])
   for state,frame in [('initialState',r['frames'][0]),('finalState',r['frames'][-1])]:
    net.load_state_dict({k:torch.tensor(v) for k,v in r[state].items()});pred=net.grid(torch.tensor(t['sensorValues']['test']),torch.tensor(x)).detach().numpy();np.testing.assert_allclose(pred[0],frame['exampleCurve'],atol=1e-12)
   for name,g in r['groups'].items():
    pred=net.grid(torch.tensor(t['sensorValues'][name]),torch.tensor(x)).detach().numpy();ref=truth(t['coefficients'][name],x);np.testing.assert_allclose(pred,g['predictions'],atol=1e-12);self.assertAlmostEqual(float(np.linalg.norm(pred-ref)/np.linalg.norm(ref)),g['relativeL2'],places=10)
 def test_residual_checks_and_structural_metrics(self):
  d=m.datasets();sensors=torch.tensor(t['sensors']);x=torch.tensor(t['x']);held=(torch.arange(197)+.37)/197
  for r in t['runs'].values():
   net=m.Model(r['kind'],r['seed']);net.load_state_dict({k:torch.tensor(v) for k,v in r['finalState'].items()});f=torch.tensor(t['sensorValues']['test']);a,b=f[:8],f[8:];mean=(net.grid(a,x)+net.grid(b,x))/2;defect=float((torch.linalg.vector_norm(net.grid((a+b)/2,x)-mean)/(torch.linalg.vector_norm(mean)+1e-12)).detach());self.assertAlmostEqual(defect,r['midpointLinearityDefect'],places=11);self.assertAlmostEqual(float(net.grid(torch.zeros(1,9),x).detach().abs().max()),r['zeroMax'],places=14)
   self.assertAlmostEqual(m.heldout_residual(net,m.forcing(d['test'],sensors),d['test'],held),r['groups']['test']['heldoutResidualRMS'],places=11)
if __name__=='__main__':unittest.main()
