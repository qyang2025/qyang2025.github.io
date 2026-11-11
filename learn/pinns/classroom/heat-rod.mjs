import {mathHtml} from './math.mjs';
import {sentences} from './player.mjs';
export function heatValue(x,t,alpha=.1){return Math.exp(-alpha*Math.PI**2*t)*Math.sin(Math.PI*x);}
export function heatTime(slide,position,activity={},language='en'){
 const counts=slide.beats.map(b=>sentences(language==='en'?b.textEn:b.text,language).length);
 // Complete the visual evolution at 3x the original narration-relative speed, then hold.
 // Keep the initial-condition view at t=0 until its later-time explanation starts.
 if(slide.id==='pinn-1-conditions')return 0;
 // The introductory bridge has no visible physical scene yet.
 const prior=counts.slice(0,position.beat).reduce((a,b)=>a+b,0);
 const fraction=activity.reason==='ended'?1:Number.isFinite(activity.audioTime)&&activity.duration>0?Math.max(0,Math.min(1,activity.audioTime/activity.duration)):0;
 return Math.max(0,Math.min(1,3*(prior+position.sentence-1+fraction)/(counts.reduce((a,b)=>a+b,0)-1)));
}
export function heatRodHtml(slide,en){
 if(slide.id==='pinn-1-motivation')return `<div class="scene-content heat-lesson rod-introduction" data-heat-rod><div class="heat-scene schematic"><div class="rod-visual" data-diagram-node="0"><div class="rod-heading">${en?'A rod with sparse temperature sensors':'只有少量温度传感器的细杆'}</div><svg viewBox="0 0 600 150" role="img" aria-label="${en?'Cooling rod with three temperature sensors':'带三个温度传感器的冷却细杆'}"><g class="rod-cells">${Array.from({length:41},(_,i)=>`<rect x="${40+i*515/41}" y="45" width="${515/41+.05}" height="40"/>`).join('')}</g><rect x="38" y="43" width="519" height="44" rx="5" fill="none" stroke="#dbe8ed" stroke-width="2.5"/>${[100,297.5,495].map(x=>`<path d="M${x} 65V105" stroke="#edf5fa" stroke-width="2.5"/><circle cx="${x}" cy="65" r="6" fill="#edf5fa" stroke="#20282e" stroke-width="2"/>`).join('')}<text x="297.5" y="132" text-anchor="middle" font-size="24">${en?'Three readings — what happens between them?':'三个读数之间，温度会怎样变化？'}</text></svg><div class="rod-readout">${en?'blue: cold · orange: warm':'蓝：冷 · 橙：热'}</div></div><div class="rod-coefficient" data-diagram-node="1">${en?'Physical constraints':'物理约束'}<span>${en?'Evolution law + conditions':'演化规律与条件'}</span></div></div></div>`;

 const conditions=slide.id==='pinn-1-conditions',exact=slide.id==='pinn-1-exact';
 const title=conditions?(en?'Initial profile':'初始分布'):exact?(en?'Spatial shape':'空间形状'):(en?'Temperature along a rod':'细杆上的温度');
 const companion=conditions?(en?'Cold endpoints':'冷却端点'):exact?(en?'Temporal decay':'时间衰减'):(en?'Diffusivity':'扩散系数');
 const companionMath=conditions?String.raw`\begin{gathered}u(0,t)=0\\u(1,t)=0\end{gathered}`:exact?'e^{-\\alpha\\pi^2t}':'\\alpha=0.1';

 return `<div class="scene-content heat-lesson" data-heat-rod><div class="heat-scene schematic"><div class="rod-visual" data-diagram-node="0"><div class="rod-heading">${title} ${mathHtml('u(x,t)')}</div><svg viewBox="0 0 600 190" role="img" aria-label="${en?'Rod with cold endpoints and a decaying temperature profile':'冷端点细杆与逐渐降低的温度分布'}"><text class="rod-model-label" x="297.5" y="17" text-anchor="middle" font-size="22">${en?'Exact sine-mode illustration':'正弦解析解演示'}</text><g class="rod-cells">${Array.from({length:41},(_,i)=>`<rect x="${40+i*515/41}" y="28" width="${515/41+.05}" height="32"/>`).join('')}</g><rect x="38" y="24" width="519" height="40" rx="5" fill="none" stroke="#dbe8ed" stroke-width="2.5"/><g class="rod-legend"><path d="M40 85H74" fill="none" stroke="#aab7c0" stroke-dasharray="6 5" stroke-width="2"/><text x="84" y="91" font-size="22">${en?'Initial profile':'初始分布'}</text><path d="M325 85H359" fill="none" stroke="#ffce72" stroke-width="3.5"/><text x="369" y="91" font-size="22">${en?'Current profile':'当前分布'}</text></g><path d="M40 97V170H555" fill="none" stroke="#c7d8e1" stroke-width="2.5"/><path class="rod-start" fill="none" stroke="#88949c" stroke-dasharray="6 5" stroke-width="2"/><path class="rod-profile" fill="none" stroke="#ffce72" stroke-width="3.5"/><text x="17" y="107" font-size="24" font-style="italic">u</text><text x="566" y="175" font-size="24" font-style="italic">x</text><text x="40" y="190" text-anchor="middle" font-size="22">0</text><text x="555" y="190" text-anchor="middle" font-size="22">1</text></svg><div class="rod-readout">${mathHtml('t=')}<span data-rod-time>0.00</span> · ${en?'blue: cold · orange: warm':'蓝：冷 · 橙：热'}</div></div><div class="rod-coefficient" data-diagram-node="1">${companion} ${mathHtml(companionMath)}<span>${conditions?(en?'At every time':'对所有时刻'):(en?'Cold endpoints held fixed':'两端始终保持零温度')}</span></div></div><div data-formula-step="0" class="formula-box equation-step">${mathHtml(en?slide.formulaEn:slide.formula)}</div></div>`;
}
export function syncHeatRod(activity,position,slide,language){
 if(typeof document==='undefined'||!['pinn-1-motivation','pinn-1-heat','pinn-1-conditions','pinn-1-exact'].includes(slide?.id)||['paused','buffering'].includes(activity.reason))return;
 const host=document.querySelector('[data-heat-rod]');if(!host)return;
 const t=slide.id==='pinn-1-conditions'&&position.beat===0?0:heatTime(slide,position,activity,language);host.dataset.time=t.toFixed(5);
 const timeLabel=host.querySelector('[data-rod-time]');if(timeLabel)timeLabel.textContent=t.toFixed(2);
 host.querySelectorAll('.rod-cells rect').forEach((cell,i)=>{const u=heatValue(i/40,t);cell.setAttribute('fill',`rgb(${Math.round(35+220*u)},${Math.round(112+45*u)},${Math.round(185-120*u)})`);});
 const path=time=>Array.from({length:101},(_,i)=>`${i?'L':'M'}${40+515*i/100},${170-62*heatValue(i/100,time)}`).join(' ');
 host.querySelector('.rod-start')?.setAttribute('d',path(0));host.querySelector('.rod-profile')?.setAttribute('d',path(t));
}
