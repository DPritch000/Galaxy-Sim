Start from random positions and random velocities, but enforce net angular momentum:
Compute total angular momentum vector 
L
L of the cluster.
Add a small coherent rotational component around 
L
L to every star (still noisy/random per star).
This preserves “random cloud” while ensuring collapse is not purely radial.
Violent relaxation control
During first N steps, use slightly stronger softening and slightly smaller timestep.
This suppresses hard slingshots that eject dense clumps during central infall.
After the system contracts, smoothly return to normal softening.
Dissipative settling for only cold/dense regions
Add weak drag only where local density is high (or where relative velocity dispersion is low).
Think of it as gas-like cooling proxy.
This lets clumps lose just enough energy to stay bound and settle toward a rotating plane.
Dynamic plane emergence (not pre-chosen)
Recompute principal inertia axis (or 
L
L axis) every few frames.
Apply tiny vertical damping toward that evolving plane.
The plane is discovered from the random cluster, not imposed beforehand.
Shear-driven arm formation
Once a compact rotating structure appears, turn on mild azimuthal perturbations (
m
=
2
m=2 or 
m
=
3
m=3, 1-3% amplitude).
Differential rotation stretches these overdensities into trailing spiral arms naturally.
Keep central potential stable
Let black hole move only a little, or anchor it with a weak spring to system COM.
A wandering center is a major source of artificial ejections.
Optional for dense clumps
Add weak dynamical friction for high-mass particles so massive knots do not get kicked onto escape trajectories.
A practical schedule:

t
∈
[
0
,
t
1
]
t∈[0,t 
1
​
 ]: collapse + strong softening + no BH drift
t
∈
[
t
1
,
t
2
]
t∈[t 
1
​
 ,t 
2
​
 ]: settling + density-based cooling
t
>
t
2
t>t 
2
​
 : normal gravity + weak perturbation growth for spiral structu