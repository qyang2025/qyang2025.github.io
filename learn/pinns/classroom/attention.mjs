import {paperDemoMeta} from './paper-demo-contract.mjs?v=presence2';
import { sentences } from './player.mjs';

export function fallbackTarget(slide, beatIndex, sentenceIndex = 0) {
  const beat = slide.beats[beatIndex];
  const nodes = slide.schematic?.nodes || [];
  const visible = nodes.map((n,index)=>({...n,index})).filter(n=>n.revealAt <= beatIndex);
  if (visible.length && (!beat.scene?.formula || sentenceIndex === 0)) return {kind:'node',index:visible.at(-1).index};
  if (beat.scene?.formula) return {kind:'formula',index:beatIndex};
  if (['scatter','projection'].includes(slide.visual)) return {kind:'chart',index:0};
  return {kind:'bullet',index:beat.focus};
}
export function attentionTarget(slide, beatIndex, sentenceIndex, language = 'zh') {
  const scene = slide.beats[beatIndex].scene;
  const cues = language === 'en' ? scene?.targetsEn : scene?.targets;
  const cue=cues?.filter(c=>c.sentence <= sentenceIndex).at(-1) || fallbackTarget(slide,beatIndex,sentenceIndex);
  if(cue.kind!=='bullet')return cue;
  if(['scatter','projection'].includes(slide.visual))return {kind:'chart',index:0};
  const formula=slide.beats.slice(0,beatIndex+1).findLastIndex(b=>b.scene?.formula);
  if(formula>=0)return {kind:'formula',index:formula};
  const node=slide.schematic?.nodes?.findLastIndex(n=>n.revealAt<=beatIndex)??-1;
  return node>=0?{kind:'node',index:node}:cue;
}
export function validateTargets(slide) {
  const customNodes=paperDemoMeta[slide.paperDemo]?.nodes||0;
  for (const [i,beat] of slide.beats.entries()) for (const [field,text,language] of [['targets',beat.text,'zh'],['targetsEn',beat.textEn,'en']]) {
    const cues=beat.scene?.[field]; if (cues === undefined) continue; // Saved legacy courses.
    const count=sentences(text || beat.text,language).length;
    if (!Array.isArray(cues) || !cues.length || cues[0].sentence !== 0) throw new Error('指向序列必须从首句开始');
    for (const [j,cue] of cues.entries()) {
      if (!Number.isInteger(cue.sentence) || cue.sentence < 0 || cue.sentence >= count || (j && cue.sentence <= cues[j-1].sentence) || !Number.isInteger(cue.index) || cue.index < 0) throw new Error('指向句子或目标索引无效');
      const valid = cue.kind === 'none' ? cue.index === 0 : cue.kind === 'node' ? (slide.schematic?.nodes?.[cue.index]?.revealAt <= i || cue.index<customNodes&&(cue.index===0||i>=1)) :
        cue.kind === 'formula' ? cue.index <= i && !!slide.beats[cue.index]?.scene?.formula && (!['scatter','projection'].includes(slide.visual) || cue.index === i) :
        cue.kind === 'chart' ? cue.index === 0 && ['scatter','projection'].includes(slide.visual) :
        cue.kind === 'bullet' ? cue.index <= beat.focus && cue.index < slide.bullets.length : false;
      if (!valid) throw new Error('指向了不存在或尚未显示的图形/公式');
    }
  }
}
export function pointerGeometry(hand, pivot, rect) {
  const center={x:rect.left+rect.width/2,y:rect.top+rect.height/2};
  const dx=hand.x-center.x,dy=hand.y-center.y;
  const distance=Math.max(Math.abs(dx)/Math.max(1,rect.width/2),Math.abs(dy)/Math.max(1,rect.height/2));
  const end=distance>1 ? {x:center.x+dx/distance,y:center.y+dy/distance} : center;
  return {end,angle:Math.max(-160,Math.min(70,Math.atan2(center.y-pivot.y,center.x-pivot.x)*180/Math.PI+4))};
}
export function segmentCrossesRect(a,b,r){
 let low=0,high=1;
 for(const [key,min,max] of [['x',r.left,r.right],['y',r.top,r.bottom]]){const delta=b[key]-a[key];if(Math.abs(delta)<1e-8){if(a[key]<min||a[key]>max)return false;continue;}let t0=(min-a[key])/delta,t1=(max-a[key])/delta;if(t0>t1)[t0,t1]=[t1,t0];low=Math.max(low,t0);high=Math.min(high,t1);if(low>high)return false;}
 return high>0&&low<1;
}
export function spotlightPosition(target,stage,obstacles=[],origin){
 const left=target.left-stage.left,top=target.top-stage.top;
 const clamp=(v,min,max)=>Math.max(min,Math.min(Math.max(min,max),v));
 const start=origin||{x:stage.left+stage.width-60,y:stage.top+stage.height-50};
 const point=x=>{const y=top+target.height+18,abs={x:x+stage.left,y:y+stage.top};const blocked=obstacles.some(r=>abs.x+10>r.left&&abs.x-10<r.right&&abs.y+10>r.top&&abs.y-10<r.bottom);return{x,y:y<=stage.height-14&&!blocked?y:clamp(top+target.height-3,6,stage.height-6),direction:'up'};};
 const centre=clamp(left+target.width/2,14,stage.width-14),base=point(centre);
 const crossings=p=>obstacles.filter(r=>segmentCrossesRect(start,{x:p.x+stage.left,y:p.y+stage.top},r)).length;
 const inset=Math.min(10,target.width/2);const nearest=clamp(start.x-stage.left,left+inset,left+target.width-inset);
 const candidates=[base,point(nearest),point(clamp(left+inset,14,stage.width-14)),point(clamp(left+target.width-inset,14,stage.width-14)),...[.15,.3,.7,.85].map(r=>point(clamp(left+target.width*r,14,stage.width-14)))];
 const distance=p=>Math.hypot(start.x-stage.left-p.x,start.y-stage.top-p.y);
 return candidates.sort((a,b)=>crossings(a)-crossings(b)||distance(a)-distance(b)||Math.abs(a.x-centre)-Math.abs(b.x-centre))[0];
}

export function laserLandingPoints(target,stage,obstacles){
 const inset=Math.min(10,target.width/2),left=target.left+inset,right=target.left+target.width-inset;
 return [0,.15,.3,.5,.7,.85,1].map(r=>{
  const x=Math.max(stage.left+14,Math.min(stage.left+stage.width-14,left+(right-left)*r)),y=target.bottom+18;
  const blocked=obstacles.some(o=>x+10>o.left&&x-10<o.right&&y+10>o.top&&y-10<o.bottom);
  return{x,y:y<=stage.top+stage.height-14&&!blocked?y:Math.max(stage.top+6,Math.min(stage.top+stage.height-6,target.bottom-3))};
 });
}
// Rule 1: minimise occlusion, including the professor. Rule 2: minimise beam length.
export function chooseLaserPlan(target,stage,content,protection,poses){
 const obstacles=[...content,...protection],absolute=p=>({x:p.x+stage.left,y:p.y+stage.top});
 const plans=poses.filter(p=>Number.isFinite(p.angle)&&p.angle>=0&&p.angle<=120).map(pose=>{
  let point=pose.landing?{x:pose.landing.x-stage.left,y:pose.landing.y-stage.top,direction:'up'}:spotlightPosition(target,stage,obstacles,pose.hand),aim=pose;
  if(pose.aimAt){aim=pose.aimAt(absolute(point));point=spotlightPosition(target,stage,obstacles,aim.hand);aim=pose.aimAt(absolute(point));}
  const end=absolute(point),crossings=obstacles.filter(r=>segmentCrossesRect(aim.hand,end,r)).length;
  // Shoulder attachment may overlap the coat; head/content collisions by the arm or pen are not acceptable.
  const armObstacles=[...content,...protection.slice(0,1)];
  const armHits=pose.shoulder&&aim.pivot?armObstacles.filter(r=>segmentCrossesRect(pose.shoulder,aim.pivot,r)||segmentCrossesRect(aim.pivot,aim.hand,r)).length:0;
  const outside=aim.hand.x<stage.left||aim.hand.x>stage.left+stage.width||aim.hand.y<stage.top||aim.hand.y>stage.top+stage.height?1:0;
  return{point,angle:pose.angle,occlusions:crossings+armHits+outside,length:Math.hypot(aim.hand.x-end.x,aim.hand.y-end.y)};
 });
 return plans.sort((a,b)=>a.occlusions-b.occlusions||a.length-b.length||a.angle-b.angle)[0];
}

export function professorProtection(rect){
 const head={left:rect.left+rect.width*.22,right:rect.right-rect.width*.08,top:rect.top+rect.height*.04,bottom:rect.top+rect.height*.66};
 const body={left:rect.left+rect.width*.36,right:rect.right-rect.width*.24,top:rect.top+rect.height*.64,bottom:rect.bottom};
 return [head,body].map(r=>({...r,width:r.right-r.left,height:r.bottom-r.top}));
}
export class TeachingPointer {
  constructor(host, professor) {
    this.host=host;this.professor=professor;this.active=false;
    this.overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');
    this.overlay.classList.add('teaching-pointer');this.overlay.setAttribute('aria-hidden','true');
    this.overlay.innerHTML='<defs><mask id="teaching-laser-mask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="white"/><g class="laser-occluders" fill="black"></g></mask></defs><path class="laser-beam" mask="url(#teaching-laser-mask)"/><circle class="focus-halo" r="6"/><circle class="pointer-tip" r="2.5"/><path class="focus-arrow"/>';
    host.append(this.overlay);this.update=this.update.bind(this);
    this.observer=new ResizeObserver(this.update);this.observer.observe(host);
    window.addEventListener('scroll',this.update,{passive:true});window.addEventListener('resize',this.update);
  }
  setTarget(cue) {const same=this.cue?.kind===cue.kind&&this.cue?.index===cue.index&&this.cue?.conceptKey===cue.conceptKey;this.cue=cue;if(same&&(this.target?.isConnected||cue.kind==='none')){this.pairRevealed();return;}this.refresh();}
  pairRevealed(){
    if(!this.active||!this.target?.isConnected)return;
    const demo=this.target.closest('[data-paper-demo]');
    if(demo)for(const peer of demo.querySelectorAll('[data-diagram-node]:not(.reveal-pending)'))if(peer!==this.target&&peer.getAttribute('aria-hidden')!=='true')peer.classList.add('paired-target');
    if(this.host.querySelector('#slide')?.dataset.integratedEquation==='true'){
      const selector=this.cue.kind==='formula'?'[data-diagram-node]:not(.reveal-pending)':'[data-formula-step="0"]:not(.reveal-pending)';
      for(const peer of this.host.querySelectorAll(selector))if(peer!==this.target&&!peer.hidden&&peer.getAttribute('aria-hidden')!=='true')peer.classList.add('paired-target');
    }
  }
  activity({speaking,reason}) { const active=!!speaking||reason==='ended'||(reason==='buffering'&&this.active);const changed=this.active!==active;this.active=active;this.speaking=!!speaking;this.host?.classList.toggle('narration-active',this.speaking);if(changed)this.refresh(); }
  refresh() {
    this.host.querySelectorAll('.paired-target').forEach(e=>e.classList.remove('paired-target'));
    this.host.querySelectorAll('.teaching-target').forEach(e=>e.classList.remove('teaching-target'));
    this.host.classList.toggle('narration-active',this.speaking);
    const selectors={node:`[data-diagram-node="${this.cue?.index}"]`,formula:`[data-formula-step="${this.cue?.index}"]`,chart:'.plot-frame',bullet:`[data-focus="${this.cue?.index}"]`};
    this.target=this.active ? this.host.querySelector(selectors[this.cue?.kind] || ':not(*)') : null;
    if (this.target?.hidden) this.target=null;
    // A recorded plot and its checkpoint metrics explain the same experimental result.
    const demoUnit=this.target?.closest('[data-paper-demo]');
    if(demoUnit)for(const peer of demoUnit.querySelectorAll('[data-diagram-node]:not(.reveal-pending)'))if(peer!==this.target&&peer.getAttribute('aria-hidden')!=='true')peer.classList.add('paired-target');
    this.target?.classList.add('teaching-target');
    // A formula and its explanatory schematic form one teaching unit.
    if(this.target&&this.host.querySelector('#slide')?.dataset.integratedEquation==='true'){
      const peers=this.cue.kind==='formula'
        ? [...this.host.querySelectorAll('[data-diagram-node]:not(.reveal-pending)')]
        : this.cue.kind==='node' ? [...this.host.querySelectorAll('[data-formula-step="0"]:not(.reveal-pending)')] : [];
      peers.filter(e=>!e.hidden&&e.getAttribute('aria-hidden')!=='true').forEach(e=>e.classList.add('paired-target'));
    }

    if(this.target) {
      const rect=this.target.getBoundingClientRect();
      if(rect.bottom<80 || rect.top>innerHeight-100) this.target.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    }
    this.overlay.style.display='none';
    this.professor.aimAngle=undefined;
    this.update();
  }
  update() {
    const box=this.host.getBoundingClientRect();
    const bottom=Math.min(Math.max(0,box.height-this.professor.element.offsetHeight-12),Math.max(0,box.bottom-innerHeight+12));
    this.professor.element.style.bottom=this.host.dataset.fixedSlide==='true'?'0px':`${bottom}px`;
    // Sentence cues still highlight the content; character gestures no longer aim at it.
    this.professor.aimAngle=undefined;
    if (!this.active || !this.target?.isConnected) {this.overlay.style.display='none';this.professor.setLaserTarget?.(null);this.professor.setLaserPose?.(null);return;}
    const rect=this.target.getBoundingClientRect();
    if(!rect.width||!rect.height){this.overlay.style.display='none';this.professor.setLaserTarget?.(null);this.professor.setLaserPose?.(null);return;}
    const contentObstacles=[...this.host.querySelectorAll('[data-diagram-node]:not([hidden]),[data-formula-step],.plot-frame,.plot-legend,.plot-note,.schematic-link,.inline-demo-chart output,.axis-math,#slide h2,.slide-eyebrow,.concept-card')].filter(e=>e!==this.target&&!this.target.contains(e)&&getComputedStyle(e).visibility!=='hidden').map(e=>e.getBoundingClientRect()).filter(r=>r.width&&r.height);
    const avatarBox=this.professor.element.getBoundingClientRect();const obstacles=[...contentObstacles,...professorProtection(avatarBox)];
    const signature=[this.cue.kind,this.cue.index,rect.left,rect.top,rect.width,rect.height,...obstacles.flatMap(r=>[r.left,r.top,r.width,r.height])].join('/');if(this.spotSignature!==signature||this.spotTarget!==this.target){this.spotSignature=signature;this.spotTarget=this.target;this.unreachable=false;const poses=this.professor.getLaserPoses?.({x:rect.left+rect.width/2,y:rect.bottom+18},laserLandingPoints(rect,box,obstacles));if(poses&&poses.length===0){this.unreachable=true;this.overlay.style.display='none';this.professor.setLaserTarget?.(null);this.professor.setLaserPose?.(null);return;}const plan=poses?.length?chooseLaserPlan(rect,box,contentObstacles,professorProtection(avatarBox),poses):null;this.lockedSpot=plan?.point||spotlightPosition(rect,box,obstacles,this.professor.getScreenAnchors?.()?.hand);this.lockedArmAngle=plan?.angle;this.overlay.querySelector('.laser-occluders').innerHTML=contentObstacles.map(r=>`<rect x="${r.left-box.left-6}" y="${r.top-box.top-6}" width="${r.width+12}" height="${r.height+12}"/>`).join('');}if(this.unreachable){this.overlay.style.display='none';this.professor.setLaserTarget?.(null);return;}const point=this.lockedSpot;this.overlay.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);const mask=this.overlay.querySelector('mask');mask.setAttribute('width',box.width);mask.setAttribute('height',box.height);this.overlay.style.display='block';
    for(const circle of this.overlay.querySelectorAll('circle')){circle.setAttribute('cx',point.x);circle.setAttribute('cy',point.y);}
    const {x,y,direction}=point;
    this.professor.setLaserPose?.(this.lockedArmAngle);
    this.professor.setLaserTarget?.({x:box.left+x,y:box.top+y});
    this.host.dataset.laserArmDegrees=String(this.lockedArmAngle??32);
    const anchors=this.professor.getScreenAnchors?.();
    const beam=this.overlay.querySelector('.laser-beam');
    if(this.professor.isLaserAligned&&!this.professor.isLaserAligned()){this.overlay.style.display='none';return;}
    if(!anchors){this.overlay.style.display='none';this.professor.setLaserTarget?.(null);this.professor.setLaserPose?.(null);return;}
    beam.style.display='block';
    if(anchors)beam.setAttribute('d',`M${anchors.hand.x-box.left},${anchors.hand.y-box.top} L${x},${y}`);
    this.overlay.querySelector('.focus-arrow').setAttribute('d',direction==='right'?`M${x+8},${y-4} L${x+13},${y} L${x+8},${y+4}Z`:direction==='up'?`M${x-4},${y-8} L${x},${y-13} L${x+4},${y-8}Z`:`M${x-4},${y+8} L${x},${y+13} L${x+4},${y+8}Z`);
    this.host.dataset.highlightKind=this.cue.kind;this.host.dataset.highlightIndex=this.cue.index;
  }

  close() {this.active=false;this.observer.disconnect();window.removeEventListener('scroll',this.update);window.removeEventListener('resize',this.update);this.overlay.remove();}
}
