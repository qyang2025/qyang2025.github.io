// Named series are an authoring contract, not a guess based on current screen position.
const profiles={};
const curve=(id,selector,words,x=.62)=>({id,selector,words,x});
const ref=(selector='polyline[stroke-dasharray]')=>curve('curve-reference',selector,'reference|exact curve|dashed curve|analytic curve|参考曲线|精确曲线|解析曲线|虚线');
const temp=(selector='polyline')=>curve('curve-temperature',selector,'temperature curve|temperature profile|temperature field|温度曲线|温度分布|温度场');
const initial=()=>curve('curve-initial','polyline[stroke-dasharray]','initial profile|initial curve|initial shape|初始曲线|初始分布|初始形状');
const model=(id,c,words)=>curve(id,`polyline[stroke="${c}"]`,words);
const set=(kinds,rows)=>kinds.forEach(k=>profiles[k]=rows);
set(['physical'],[initial(),temp('polyline[stroke="#ffe071"]')]);
set(['training','comparison'],[ref('polyline[stroke="#79d4ef"]'),model('curve-pinn','#ffe071','PINN curve|gold curve|金色曲线|PINN 曲线'),model('curve-data','#ff8e9e','data-only curve|pink curve|纯数据曲线|粉色曲线')]);
set(['inverse-a','inverse-b'],[ref('path[stroke="#d5dce0"]'),model('curve-clean','#79d4ef','clean trajectory|clean curve|干净.*曲线|无噪声.*轨迹'),model('curve-noisy','#ffe071','noisy trajectory|noisy curve|含噪.*轨迹|噪声.*曲线')]);
set(['gradient-training','transport-training','sampling-training','gpinn-training','gpinn-slope','vpinn-training'],[ref()]);
set(['transport-physical'],[initial(),temp('polyline:not([stroke-dasharray])')]);
set(['causal-training','causal-phase'],[ref()]);set(['causal-energy'],[ref('.energy-reference')]);
set(['gpinn-physical','sampling-physical','vpinn-physical','fourier-physical'],[temp()]);
set(['cpinn-physical'],[temp('polyline[stroke="#ffe071"]'),curve('curve-left','polyline[stroke="#ffe071"]','left material|left part of the rod|left temperature|左侧材料|左半段|左侧温度',.26),curve('curve-right','polyline[stroke="#ffe071"]','right material|right part of the rod|right temperature|右侧材料|右半段|右侧温度',.78)]);
set(['cpinn-training','cpinn-flux'],[ref('polyline[stroke="#ced8df"]')]);
set(['ntk-training','fourier-training','fbp-training'],[ref('polyline[stroke="#9baaac"]'),model('curve-global','#cbd7de','global curve|global model curve|全局曲线|全局模型曲线')]);
set(['fourier-features'],[model('curve-low','#79d4ef','blue curve|low.frequency curve|蓝色曲线|低频曲线'),model('curve-high','#c7b4ff','purple curve|high.frequency curve|紫色曲线|高频曲线')]);
set(['fourier-modes'],[model('curve-low','#79d4ef','one.cycle|low.frequency|低频|一个周期'),model('curve-high','#c7b4ff','six.cycle|high.frequency|高频|六个周期')]);
set(['fbp-parts'],[ref('polyline[stroke="#ff9eb2"]')]);
set(['bpinn-sampling','bpinn-high'],[ref('polyline[stroke="#a9b7bd"]'),model('curve-mean','#ffe071','posterior mean|gold curve|后验均值|金色曲线')]);
set(['hpinn-training','hpinn-objective'],[model('curve-neural','#ffe071','neural temperature|neural curve|neural score|gold|神经温度|神经曲线|神经目标|金色'),model('curve-physical','#79d4ef','physical solution|physical curve|physical score|blue|物理解|物理曲线|物理目标|蓝色')]);
set(['xpinn-physical'],[temp()]);
set(['xpinn-training'],[ref('polyline[stroke="#91a3aa"]')]);
set(['sa-physical'],[temp()]);
set(['sa-training'],[ref('polyline[stroke="#91a3aa"]')]);
set(['sa-loss'],[model('curve-weighted','#ffe071','(?<!un)weighted loss|(?<!未)加权损失'),model('curve-unweighted','#79d4ef','unweighted loss|未加权损失')]);
set(['operator-physical'],[curve('curve-source','.operator-source-curve','upper curve|source curve|上方曲线|热源曲线'),curve('curve-temperature','.operator-temperature-curve','lower curve|temperature curve|下方曲线|下方是.*温度|温度曲线')]);
set(['operator-training'],[ref('polyline[stroke="#91a3aa"]')]);
set(['operator-frequency'],[ref('polyline[stroke="#ff9eb2"]')]);
set(['primer-demo'],[ref('polyline[stroke="#79d4ef"]'),model('curve-pinn','#ffe071','network curve|gold curve|网络曲线|金色曲线')]);
// The four introductory heat animations retain their existing live SVG paths.
set(['heat-rod'],[curve('curve-initial','.rod-start','initial profile|initial curve|dashed|初始分布|初始曲线|虚线'),curve('curve-temperature','.rod-profile','current profile|current curve|gold curve|当前分布|当前曲线|金色曲线')]);
export const plotFocusProfiles=Object.freeze(profiles);
export const numericMetricKinds=new Set(['training','comparison','inverse-a','inverse-b','gradient-training','gradient-norms','gradient-weight','transport-training','causal-training','causal-weights','gpinn-training','gpinn-slope','gpinn-residual','sampling-points','sampling-probability','sampling-training','cpinn-training','cpinn-flux','cpinn-jumps','vpinn-training','boundary-training','ntk-training','fourier-training','fbp-training','bpinn-sampling','bpinn-high','hfm-training','hpinn-training','hpinn-density','xpinn-training','sa-weights','sa-training','operator-training','piop-training']);
export function curveFocusMatches(kind,text){
 return (profiles[kind]||[]).filter(p=>new RegExp(p.words,'i').test(text));
}
// Fixed horizontal fractions track the data, avoiding length-based left/right drift.
export function curvePointAtFraction(curve,fraction=.62){
 if(curve.points?.numberOfItems){const a=Array.from(curve.points),lo=Math.min(...a.map(p=>p.x)),hi=Math.max(...a.map(p=>p.x)),x=lo+(hi-lo)*fraction;for(let i=1;i<a.length;i++)if((a[i-1].x-x)*(a[i].x-x)<=0&&a[i].x!==a[i-1].x){const q=(x-a[i-1].x)/(a[i].x-a[i-1].x);return{x,y:a[i-1].y+q*(a[i].y-a[i-1].y)};}return{x:a[0].x,y:a[0].y};}
 if(curve.getTotalLength){const b=curve.getBBox(),x=b.x+b.width*fraction,n=curve.getTotalLength();let lo=0,hi=n;for(let i=0;i<18;i++){const m=(lo+hi)/2;if(curve.getPointAtLength(m).x<x)lo=m;else hi=m;}return curve.getPointAtLength((lo+hi)/2);}
 return null;
}
export function annotatePlotFocus(host,kind=host?.dataset.paperDemo){
 const svg=host?.querySelector('svg');if(!svg)return;
 const active=host.dataset.teachingDetailActive;
 for(const profile of profiles[kind]||[]){
   const curves=[...svg.querySelectorAll(profile.selector)];if(!curves.length)continue;
   for(const curve of curves){curve.dataset.focusSeries=((curve.dataset.focusSeries||'').split(' ').filter(Boolean).filter(x=>x!==profile.id).concat(profile.id)).join(' ');}
   const curve=curves.find(c=>{const b=c.getBBox();return b.width>10;})||curves[0],p=curvePointAtFraction(curve,profile.x);if(!p)continue;
   let a=svg.querySelector(`[data-teaching-detail="${profile.id}"]`);if(!a){a=document.createElementNS('http://www.w3.org/2000/svg','circle');a.classList.add('curve-anchor');a.dataset.teachingDetail=profile.id;a.setAttribute('r','2');a.setAttribute('fill','transparent');svg.append(a);}a.setAttribute('cx',p.x);a.setAttribute('cy',p.y);
 }
 for(const curve of svg.querySelectorAll('[data-focus-series]'))curve.classList.toggle('focused-curve',(curve.dataset.focusSeries||'').split(' ').includes(active));
}
