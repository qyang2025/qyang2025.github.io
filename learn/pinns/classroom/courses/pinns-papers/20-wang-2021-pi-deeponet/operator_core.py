"""Tiny supervised function-to-field operator experiment. Analytic labels,no expensive simulation."""
import argparse,json,math,time,platform
from pathlib import Path
import numpy as np
import torch
from torch import nn
KINDS=('deeponet','linear','concat');SCALE=1/math.pi**2

def forcing(coeff,x):
 k=torch.arange(1,coeff.shape[1]+1,dtype=x.dtype);return coeff@torch.sin(math.pi*x.reshape(-1,1)*k).T

def exact(coeff,x):
 k=torch.arange(1,coeff.shape[1]+1,dtype=x.dtype);return (coeff/(math.pi*k).square())@torch.sin(math.pi*x.reshape(-1,1)*k).T

def datasets():
 rng=np.random.default_rng(2026);train=torch.tensor(rng.uniform(-1,1,(24,3)));test=torch.tensor(rng.uniform(-1,1,(16,3)));out=[]
 while len(out)<8:
  a=rng.uniform(-2,2,3)
  if np.max(np.abs(a))>1:out.append(a.tolist())
 return dict(train=train,test=test,amplitude=torch.tensor(out),frequency=torch.tensor([[0.,0.,0.,1.]]))

class Model(nn.Module):
 def __init__(self,kind,seed):
  super().__init__();torch.manual_seed(seed);self.kind=kind
  if kind=='concat':self.net=nn.Sequential(nn.Linear(10,40),nn.Tanh(),nn.Linear(40,1))
  else:
   self.branch=nn.Linear(9,8,bias=False) if kind=='linear' else nn.Sequential(nn.Linear(9,16),nn.Tanh(),nn.Linear(16,8));self.trunk=nn.Sequential(nn.Linear(1,16),nn.Tanh(),nn.Linear(16,8));self.bias=nn.Parameter(torch.zeros(())) if kind=='deeponet' else None
  for layer in self.modules():
   if isinstance(layer,nn.Linear):nn.init.xavier_normal_(layer.weight);nn.init.zeros_(layer.bias) if layer.bias is not None else None
 def grid(self,samples,x):
  x=x.reshape(-1,1);factor=(x*(1-x)).T
  if self.kind=='concat':
   m,n=len(samples),len(x);inputs=torch.cat([samples[:,None,:].expand(m,n,9),(2*x-1)[None,:,:].expand(m,n,1)],2);return self.net(inputs).squeeze(-1)*factor
  value=self.branch(samples)@self.trunk(2*x-1).T
  if self.bias is not None:value=value+self.bias
  return value*factor
