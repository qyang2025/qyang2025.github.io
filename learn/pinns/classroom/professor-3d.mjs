import * as T from './vendor/three/three.module.mjs';
import {easeToward} from './expression.mjs';
export const facePoses={
 smile:{brow:0,asym:0,eyes:1,tilt:0,yaw:0,pitch:0,smile:.15,other:0},
 curious:{brow:.15,asym:.23,eyes:1.3,tilt:.2,yaw:-.12,pitch:0,smile:.02,other:.4},
 focused:{brow:-.045,asym:-.12,eyes:.82,tilt:-.07,yaw:-.1,pitch:.08,smile:.035,other:.1},
 encouraging:{brow:.1,asym:0,eyes:.6,tilt:-.1,yaw:0,pitch:0,smile:.22,other:-1.8},
 thinking:{brow:.12,asym:.35,eyes:.8,tilt:.18,yaw:.22,pitch:-.12,smile:-.035,other:2.35},
 listening:{brow:.09,asym:.04,eyes:1.2,tilt:-.22,yaw:-.18,pitch:.03,smile:.08,other:-2.7},
 concerned:{brow:-.02,asym:-.32,eyes:1.1,tilt:.1,yaw:0,pitch:0,smile:-.12,other:.2}
};
export const laserPoseAngles=[10,20,32,45,60,75,90,105,120];
// Acceleration-limited easing avoids a fast snap when the selected elevation changes.
export function naturalArmStep(state,target,dt){
 const h=Math.min(.05,Math.max(0,dt/1000)),speed=80*Math.PI/180,acceleration=200*Math.PI/180;
 const distance=target-state.angle,force=Math.max(-acceleration,Math.min(acceleration,36*distance-12*state.velocity));
 const velocity=Math.max(-speed,Math.min(speed,state.velocity+force*h));
 const angle=state.angle+velocity*h;
 return distance*(target-angle)<=0?{angle:target,velocity:0}:{angle,velocity};
}
export function aimRotation(angle){let a=(94-angle)*Math.PI/180;return Math.atan2(Math.sin(a),Math.cos(a));}
export function smoothAngle(current,target,dt){const d=Math.atan2(Math.sin(target-current),Math.cos(target-current));return current+easeToward(0,d,dt,180);}
// Rounded cartoon mittens keep the silhouette simple and readable at classroom size.
export function createCartoonHand(side,skin){
 const group=new T.Group(),geometry=new T.SphereGeometry(1,20,12);
 const palm=new T.Mesh(geometry,skin);palm.scale.set(.10,.12,.075);group.add(palm);
 const thumb=new T.Mesh(geometry,skin);thumb.position.set(-side*.09,.015,.025);thumb.scale.set(.055,.065,.055);thumb.rotation.z=side*.35;group.add(thumb);
 const tip=new T.Object3D();tip.position.set(0,-.14,.035);group.add(tip);return{group,indexTip:tip};
}
export function elbowPosition(shoulder,wrist,side,length=.49){
 const direction=wrist.clone().sub(shoulder),distance=direction.length();direction.normalize();
 const along=Math.min(length,distance/2),height=Math.sqrt(Math.max(0,length*length-along*along));
 const bend=new T.Vector3(side*.25,-1,.15);bend.addScaledVector(direction,-bend.dot(direction)).normalize();
 return shoulder.clone().addScaledVector(direction,along).addScaledVector(bend,height);
}
// Measured from the relaxed downward arm: never lift beyond 45 degrees.
export function gentleArmAngle(side,{expression='smile',speaking=false,energy=0,time=0,reduced=false}={}){
 const base=speaking?({encouraging:32,thinking:25,listening:20,curious:30,focused:28,concerned:26,smile:27})[expression]||27:({thinking:18,listening:14})[expression]||12;
 const pulse=speaking&&!reduced?Math.sin(time/430+side*1.15)*(10+Math.min(1,Math.max(0,energy))*8):0;
 return side*Math.max(8,Math.min(45,base+pulse))*Math.PI/180;
}
export class ProfessorRig {
 constructor(element){
  this.element=element;this.intensity=1.8;this.pose={...facePoses.smile};
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.setClearColor(0,0);
  this.canvas=this.renderer.domElement;this.canvas.className='professor-3d';this.canvas.setAttribute('role','img');this.canvas.setAttribute('aria-label','3D Q版教授');element.append(this.canvas);
  this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-1.7,1.7,2,-2,.1,30);this.camera.position.set(0,1.65,7);this.camera.lookAt(0,1.65,0);
  this.scene.add(new T.HemisphereLight(0xfff5e0,0x556b83,2.2));let key=new T.DirectionalLight(0xffe4c5,3.5);key.position.set(-3,5,6);this.scene.add(key);let rim=new T.DirectionalLight(0xa8dafa,2.2);rim.position.set(3,2,-2);this.scene.add(rim);
  this.root=new T.Group();this.scene.add(this.root);this.root.rotation.y=-.12;
  this.materials={skin:new T.MeshStandardMaterial({color:0xf0bf94,roughness:.65}),coat:new T.MeshStandardMaterial({color:0xf9f5e9,roughness:.75}),shirt:new T.MeshStandardMaterial({color:0x588e85}),dark:new T.MeshStandardMaterial({color:0x233f49,roughness:.55}),hair:new T.MeshStandardMaterial({color:0xe5e4d7,roughness:.9}),white:new T.MeshStandardMaterial({color:0xffffff}),pupil:new T.MeshStandardMaterial({color:0x142f37,roughness:.2}),mouth:new T.MeshStandardMaterial({color:0x522b30}),tongue:new T.MeshStandardMaterial({color:0xe68481}),cheek:new T.MeshStandardMaterial({color:0xef9a88,transparent:true,opacity:.5})};
  this.sphere=new T.SphereGeometry(1,24,16);this.cylinder=new T.CylinderGeometry(1,1,1,16);
  const m=this.materials,r=this.root;
  this.ball(r,[0,1.02,0],[.29,.30,.22],m.coat);this.ball(r,[0,1.09,.20],[.10,.19,.035],m.shirt);
  for(const x of [-.11,.11]){this.ball(r,[x,.72,0],[.09,.13,.10],m.dark);this.ball(r,[x,.58,.06],[.11,.065,.15],m.dark);this.ball(r,[x,1.19,.21],[.085,.12,.025],m.white).rotation.z=x>0?-.3:.3;}
  for(const y of [.98,.87])this.ball(r,[.035,y,.22],[.016,.016,.012],m.dark);
  this.head=new T.Group();this.head.position.set(0,2,0);r.add(this.head);
  this.ball(this.head,[0,0,0],[.72,.72,.58],m.skin);for(let x of [-.72,.72])this.ball(this.head,[x,-.03,0],[.14,.2,.14],m.skin);
  this.ball(this.head,[0,.31,-.18],[.73,.48,.51],m.hair);
  for(let i=0;i<8;i++){const a=i/7*Math.PI;this.ball(this.head,[Math.cos(a)*.61,.32+Math.sin(a)*.37,.35],[.23,.21,.22],m.hair);}
  this.ball(this.head,[0,-.12,.58],[.11,.13,.14],m.skin);
  this.eyes=[];this.pupils=[];this.brows=[];
  for(const x of [-.28,.28]){
   const eye=this.ball(this.head,[x,.02,.535],[.17,.18,.075],m.white);this.eyes.push(eye);
   const pupil=this.ball(this.head,[x,.02,.614],[.068,.105,.028],m.pupil);this.pupils.push(pupil);this.ball(pupil,[-.25,.28,.78],[.22,.18,.1],m.white);
   const brow=this.ball(this.head,[x,.3,.57],[.19,.045,.045],m.dark);this.brows.push(brow);
   const glass=new T.Mesh(new T.TorusGeometry(.215,.026,8,40),m.dark);glass.position.set(x,.025,.68);glass.scale.set(1,.83,1);this.head.add(glass);
   this.ball(this.head,[x*1.5,-.23,.49],[.11,.06,.025],m.cheek);
  }
  this.segment(this.head,new T.Vector3(-.065,.04,.69),new T.Vector3(.065,.04,.69),.025,m.dark);
  this.lipGeometry=new T.BufferGeometry().setFromPoints(Array.from({length:25},()=>new T.Vector3()));this.lips=new T.Line(this.lipGeometry,new T.LineBasicMaterial({color:0x8e4b43,linewidth:2}));this.head.add(this.lips);
  this.openMouth=this.ball(this.head,[0,-.32,.555],[.18,.01,.035],m.mouth);this.tongue=this.ball(this.head,[0,-.36,.587],[.105,.025,.01],m.tongue);
  this.leftHand=createCartoonHand(-1,m.skin);this.rightHand=createCartoonHand(1,m.skin);
  this.pointArm=this.leftHand.group;this.otherArm=this.rightHand.group;r.add(this.pointArm,this.otherArm);
  this.pointArm.position.set(-.43,.88,.25);this.otherArm.position.set(.43,.88,.25);
  this.pointArm.rotation.z=.15;this.otherArm.rotation.z=-.15;this.tip=this.leftHand.indexTip;
  this.arms=[[-1,this.pointArm],[1,this.otherArm]].map(([side,hand])=>{
   const joint=new T.Group();joint.position.set(side*.215,1.15,.02);r.add(joint);
   // Bury the pivot inside the coat; a rounded shoulder blends into a tapered sleeve.
   this.ball(joint,[0,0,0],[.098,.102,.108],m.coat);
   const sleeve=new T.Mesh(new T.CylinderGeometry(.082,.056,.27,24),m.coat);
   sleeve.position.y=-.13;joint.add(sleeve);
   joint.add(hand);hand.position.set(0,-.35,0);hand.rotation.set(0,0,0);
   return{side,hand,joint};
  });
  this.laser=new T.Group();this.laser.position.set(0,-.015,0);this.pointArm.add(this.laser);
  const penMaterial=new T.MeshStandardMaterial({color:0x34414b,metalness:.65,roughness:.3});
  this.segment(this.laser,new T.Vector3(0,-.09,0),new T.Vector3(0,.23,0),.024,penMaterial);
  this.ball(this.laser,[0,.235,0],[.031,.035,.031],m.dark);
  this.laserEmitter=this.ball(this.laser,[0,.263,0],[.017,.012,.017],new T.MeshStandardMaterial({color:0xa4ffd9,emissive:0x43ffad,emissiveIntensity:.3}));
  this.laserTip=new T.Object3D();this.laserTip.position.set(0,.278,0);this.laser.add(this.laserTip);this.tip=this.laserTip;
  this.laserAim=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),Math.PI);this.laser.quaternion.copy(this.laserAim);
  this.canvas.dataset.wrist='fixed';
  this.canvas.setAttribute('aria-label','3D Q版教授：大头、小身体、木偶式直手臂和卡通手');this.canvas.dataset.handStyle='cartoon-mitten';
  this.badge=document.createElement('span');this.badge.className='professor-emotion';this.badge.setAttribute('aria-live','polite');element.append(this.badge);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(element);this.resize();element.classList.add('has-3d');element.dataset.renderer='webgl3d';
 }
 ball(parent,position,scale,material){const mesh=new T.Mesh(this.sphere,material);mesh.position.set(...position);mesh.scale.set(...scale);parent.add(mesh);return mesh;}
 segment(parent,a,b,r,material){const mesh=new T.Mesh(this.cylinder,material);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(r,a.distanceTo(b),r);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());parent.add(mesh);return mesh;}
 resize(){const w=this.element.clientWidth||240,h=this.element.clientHeight||300,aspect=w/h;this.camera.left=-1.45*aspect;this.camera.right=1.45*aspect;this.camera.top=1.45;this.camera.bottom=-1.45;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
 update({expression,energy,speaking,time,dt,reduced,blink}){
  const target=facePoses[expression]||facePoses.smile;
  for(const k of Object.keys(target))this.pose[k]=easeToward(this.pose[k],target[k],dt,180);
  const p=this.pose,g=this.intensity,e=energy;
  this.head.rotation.set(p.pitch*g,p.yaw*g,p.tilt*g+(reduced?0:Math.sin(time/480)*(speaking ? .035 : 0)));
  this.root.position.y=(reduced||this.laserActive)?0:Math.sin(time/700)*.014+(speaking?Math.sin(time/220)*e*.02:0);
  this.root.rotation.z=(reduced||this.laserActive)?0:Math.sin(time/1100)*.012;
  this.eyes.forEach((eye,i)=>{const s=Math.max(.06,(1+(p.eyes-1)*g)*blink);eye.scale.y=.18*s;this.pupils[i].scale.y=.105*s;this.pupils[i].position.y=.02+(expression==='thinking'?.05:0);});
  this.brows.forEach((b,i)=>{b.position.y=.3+p.brow*g;b.rotation.z=p.asym*g*(i===0?1:-1);});
  const open=Math.min(.2,e*.22)+(expression==='curious'?.06:0);this.openMouth.scale.y=Math.max(.005,open);this.openMouth.scale.x=expression==='curious'?.1:.18;this.openMouth.visible=open>.018;this.tongue.visible=open>.08;this.tongue.position.y=-.32-open*.65;
  const coords=this.lipGeometry.attributes.position;for(let i=0;i<25;i++){const x=(i/24-.5)*.4;coords.setXYZ(i,x,-.31-p.smile*g*(1-(x/.2)**2),.572);}coords.needsUpdate=true;this.lips.visible=!this.openMouth.visible;
  for(const arm of this.arms){
   // The pointer planner selects a stable pose, with 120 degrees only an upper bound.
   // Keep it steady while aiming; the free arm and face remain expressive.
   const angle=arm.hand===this.pointArm&&this.laserActive ? -(this.laserArmAngle??32)*Math.PI/180 : gentleArmAngle(arm.side,{expression,speaking,energy:e,time,reduced});
   const targetRotation=new T.Quaternion().setFromEuler(new T.Euler(-.08,0,angle));
   if(arm.hand===this.pointArm){
    arm.motion||={angle:-new T.Euler().setFromQuaternion(arm.joint.quaternion).z,velocity:0};
    arm.motion=reduced?{angle:-angle,velocity:0}:naturalArmStep(arm.motion,-angle,dt);
    arm.joint.quaternion.setFromEuler(new T.Euler(-.08,0,-arm.motion.angle));
   }else arm.joint.quaternion.slerp(targetRotation,reduced?1:1-Math.exp(-Math.min(100,Math.max(0,dt))/160));
  }
  this.laser.quaternion.slerp(this.laserAim,reduced?1:1-Math.exp(-Math.min(100,Math.max(0,dt))/130));
  this.laserEmitter.material.emissiveIntensity=this.laserActive&&this.isLaserAligned()?2.5:.3;
  this.canvas.dataset.gestureDegrees=this.arms.map(a=>new T.Euler().setFromQuaternion(a.joint.quaternion).z*180/Math.PI).map(a=>a.toFixed(2)).join(',');
  this.badge.textContent='';
  this.badge.dataset.expression=expression;this.element.dataset.expressionIntensity=String(g);
  this.canvas.dataset.mouthOpening=open.toFixed(4);this.canvas.dataset.headPose=[this.head.rotation.x,this.head.rotation.y,this.head.rotation.z].map(v=>v.toFixed(3)).join(',');this.canvas.dataset.armAngle=this.pointArm.rotation.z.toFixed(4);
  this.renderer.render(this.scene,this.camera);
 }
 laserPoseCandidates(point,landings=[point]){
  this.scene.updateMatrixWorld(true);const rect=this.canvas.getBoundingClientRect(),joint=this.arms.find(a=>a.hand===this.pointArm).joint;
  const rootMatrix=new T.Matrix4().compose(new T.Vector3(this.root.position.x,0,this.root.position.z),new T.Quaternion().setFromEuler(new T.Euler(this.root.rotation.x,this.root.rotation.y,0)),this.root.scale);
  if(this.root.parent)rootMatrix.premultiply(this.root.parent.matrixWorld);
  const project=v=>{v=v.clone().project(this.camera);return{x:rect.left+(v.x+1)*rect.width/2,y:rect.top+(1-v.y)*rect.height/2};};
  const poseAt=angle=>{
   const matrix=new T.Matrix4().compose(joint.position,new T.Quaternion().setFromEuler(new T.Euler(-.08,0,-angle*Math.PI/180)),joint.scale).premultiply(rootMatrix);
   const handMatrix=matrix.clone().multiply(this.pointArm.matrix),origin=this.laser.position.clone().applyMatrix4(handMatrix),axis=new T.Vector3(0,-1,0).transformDirection(handMatrix);
   return{angle,shoulder:project(new T.Vector3().applyMatrix4(matrix)),pivot:project(origin),hand:project(origin.clone().addScaledVector(axis,.278))};
  };
  const error=(p,goal)=>{const dx=p.hand.x-p.pivot.x,dy=p.hand.y-p.pivot.y;return dx*(goal.y-p.hand.y)-dy*(goal.x-p.hand.x);};
  // Solve the whole straight arm/pen ray for each bottom-edge landing, rather than twisting the pen at the wrist.
  return landings.flatMap(goal=>{
   const roots=[];let a=0,pa=poseAt(a),ea=error(pa,goal);
   for(let b=5;b<=120;b+=5){const pb=poseAt(b),eb=error(pb,goal);if(Math.abs(ea)<1e-7||ea*eb<=0){let lo=a,hi=b,elo=ea;for(let i=0;i<24;i++){const mid=(lo+hi)/2,em=error(poseAt(mid),goal);if(elo*em<=0)hi=mid;else{lo=mid;elo=em;}}const pose=poseAt(Math.abs(ea)<1e-7?a:(lo+hi)/2);const dx=pose.hand.x-pose.pivot.x,dy=pose.hand.y-pose.pivot.y;if(dx*(goal.x-pose.hand.x)+dy*(goal.y-pose.hand.y)>0)roots.push({...pose,landing:goal});}a=b;pa=pb;ea=eb;}
   return roots;
  });
 }
 isLaserAligned(){const arm=this.arms.find(a=>a.hand===this.pointArm);return !!this.laserActive&&Math.abs((arm.motion?.angle??Infinity)-(this.laserArmAngle??32)*Math.PI/180)<Math.PI/180;}
 aimLaserAt(point){
  this.laserActive=!!point;
  // Local -Y is the continuation of the straight shoulder/hand axis.
  this.laserAim.setFromAxisAngle(new T.Vector3(0,0,1),Math.PI);
 }
 screenAnchors(){this.scene.updateMatrixWorld(true);const rect=this.canvas.getBoundingClientRect();const project=obj=>{const v=obj.getWorldPosition(new T.Vector3()).project(this.camera);return{x:rect.left+(v.x+1)*rect.width/2,y:rect.top+(1-v.y)*rect.height/2};};const hand=project(this.laserTip),pivot=project(this.laser);this.canvas.dataset.laserTip=[hand.x,hand.y].map(v=>v.toFixed(2)).join(',');this.canvas.dataset.laserBase=[pivot.x,pivot.y].map(v=>v.toFixed(2)).join(',');return{hand,pivot};}

 close(){this.observer.disconnect();const geometry=new Set(),materials=new Set();this.scene.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)materials.add(o.material);});geometry.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());this.renderer.dispose();this.canvas.remove();this.badge.remove();}
}
