"""Run with Python 3: python pca_demo.py > pca-trace.json
No external packages. The classroom replays these executed numerical results.
"""
import json
from math import sin, cos, pi, sqrt

def center(X):
    mean = [sum(p[j] for p in X)/len(X) for j in range(2)]
    return [[p[j]-mean[j] for j in range(2)] for p in X]

def direction(theta):
    return [cos(theta), sin(theta)]

def project(Xc, w):
    return [p[0]*w[0]+p[1]*w[1] for p in Xc]

def sample_variance(z):
    mean = sum(z)/len(z)
    return sum((v-mean)**2 for v in z)/(len(z)-1)

# These symmetric points have sample covariance exactly diag(4, 1).
X = [(sqrt(8*47/48)*cos(2*pi*i/48)+3,
      sqrt(2*47/48)*sin(2*pi*i/48)+2) for i in range(48)]
Xc = center(X)
C = [[sum(p[i]*p[j] for p in Xc)/(len(Xc)-1) for j in range(2)] for i in range(2)]
frames = []
for degrees in range(181):
    theta = degrees*pi/180
    w = direction(theta)
    z = project(Xc, w)
    variance = sample_variance(z)
    frames.append(dict(degrees=degrees, w=w, z=z, variance=variance))
assert abs(frames[0]['variance']-4)<1e-10
assert abs(frames[90]['variance']-1)<1e-10
print(json.dumps(dict(X=X, Xc=Xc, covariance=C, frames=frames)))
