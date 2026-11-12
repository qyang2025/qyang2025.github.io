import {phrasePresence} from './teaching-presence.mjs?v=paper13c';
import {ProfessorRig} from './professor-3d.mjs?v=paper13c';
import {poses,chooseExpression,easeToward} from './expression.mjs';
export function currentScene(slide,beat){return beat.scene||{formula:slide.formula,caption:slide.bullets[beat.focus],gesture:slide.visual==='equation'?'write':'point',stage:beat.focus};}
export class ProfessorStage {
 constructor(element){
  this.element=element;this.tick=this.tick.bind(this);this.pose=[...poses.smile];this.energy=0;this.armAngle=-6;
  this.nodes=Object.fromEntries(['mouth-open','mouth-closed','avatar-body','avatar-head','pointing-arm','eyes','brow-left','brow-right','expression-mark'].map(k=>[k,element.querySelector('.'+k)]));
  const arm=this.nodes['pointing-arm'];if(arm)arm.parentNode.append(arm);
  this.motion=matchMedia('(prefers-reduced-motion: reduce)');element.classList.add('expressive');this.nextBlink=performance.now()+3500;
  try{this.rig=new ProfessorRig(element);}catch(error){element.dataset.renderer='svg-fallback';console.warn('3D unavailable; SVG professor retained',error);}
  this.setScene({});this.frame=requestAnimationFrame(this.tick);
 }
 setScene(scene,context={}){if(context.text!==this.context?.text){this.audioTime=0;this.audioDuration=0;}if(context.thinking||context.listening){this.preview=null;clearInterval(this.demoTimer);}this.scene=scene;this.context=context;this.element.dataset.gesture=scene.gesture||'point';this.setExpression(this.preview||chooseExpression(scene,context));}
 setExpressionPreview(name){if(name==='auto'){clearInterval(this.demoTimer);this.demoTimer=null;}this.preview=poses[name]?name:null;this.setExpression(this.preview||chooseExpression(this.scene,this.context));}
 setExpression(name){this.expression=name;this.element.dataset.expression=name;const mark=this.nodes['expression-mark'];if(mark)mark.textContent=({curious:'?',thinking:'…',encouraging:'✓'})[name]||'';}
 setIntensity(value){if(this.rig)this.rig.intensity=Math.max(.7,Math.min(2,Number(value)||1.8));}
 demoExpressions(){clearInterval(this.demoTimer);const names=['curious','thinking','listening','encouraging','concerned','focused','smile'];let i=0;this.setExpressionPreview(names[i++]);this.demoTimer=setInterval(()=>{if(i>=names.length){this.setExpressionPreview('auto');return;}this.setExpressionPreview(names[i++]);},2000);}
 setLaserTarget(point){this.laserTarget=point;this.rig?.aimLaserAt(point);}
 setLaserPose(angle){if(this.rig)this.rig.laserArmAngle=angle;}
 getLaserPoses(point,landings){return this.rig?.laserPoseCandidates(point,landings);}
 isLaserAligned(){return this.rig?.isLaserAligned()??true;}
 getScreenAnchors(){return this.rig?.screenAnchors();}
 activity({speaking,amplitude,audioTime,duration}){if(Number.isFinite(audioTime))this.audioTime=audioTime;if(Number.isFinite(duration))this.audioDuration=duration;this.speaking=!!speaking;this.element.dataset.speaking=String(this.speaking);this.level=speaking&&Number.isFinite(amplitude)?Math.min(1,amplitude*4.5):0;}
 tick(time){
  if(this.closed)return;
  const dt=this.last?time-this.last:16;this.last=time;
  this.pose=this.pose.map((v,i)=>easeToward(v,poses[this.expression][i],dt,220));
  this.energy=easeToward(this.energy,this.level||0,dt,this.level>this.energy?45:105);
  const n=this.nodes,p=this.pose,reduced=this.motion.matches,e=this.energy;const presence=phrasePresence({text:this.context.text,audioTime:this.audioTime,duration:this.audioDuration,speaking:this.speaking,reduced});
  n['mouth-open'].style.opacity=Math.min(1,e*12);n['mouth-open'].style.transform=`scale(${.82+e*.25},${.06+e*1.4})`;
  n['mouth-closed'].style.opacity=1-Math.min(1,e*12);n['mouth-closed'].setAttribute('d',`M137 144 Q151 ${p[4]} 165 143`);
  if(time>=this.nextBlink){this.blinkAt=time;this.nextBlink=time+3200+Math.random()*2400;}
  const blink=!reduced&&this.blinkAt&&time-this.blinkAt<150?Math.max(.08,Math.abs((time-this.blinkAt)/75-1)):1;
  n.eyes.style.transform=`scaleY(${p[3]*blink})`;
  n['brow-left'].style.transform=`translateY(${p[2]}px) rotate(${p[0]}deg)`;n['brow-right'].style.transform=`translateY(${p[2]}px) rotate(${p[1]}deg)`;
  n['avatar-head'].style.transform=reduced?'none':`rotate(${p[5]+(presence.nod*2)}deg)`;
  n['avatar-body'].style.transform=reduced?'none':`translateY(${Math.sin(time/2100)*.35}px) rotate(${presence.gesture*.15}deg)`;
  const goal=-6+presence.gesture*5;
  this.armAngle=reduced?goal:easeToward(this.armAngle,goal,dt,this.speaking?170:280);
  n['pointing-arm'].style.transform=`rotate(${this.armAngle}deg)`;
  this.element.dataset.mouthActivity=e>.03?'audio':'quiet';
  this.rig?.update({expression:this.expression,energy:e,speaking:this.speaking,aimAngle:this.aimAngle,time,dt,reduced,blink,presence,engaged:!!this.context.playing});
  if((this.speaking||this.laserTarget)&&(!this.pointerTick||time-this.pointerTick>=45)){this.onFrame?.();this.pointerTick=time;}
  this.frame=requestAnimationFrame(this.tick);
 }
 close(){clearInterval(this.demoTimer);this.rig?.close();this.closed=true;cancelAnimationFrame(this.frame);}
}
