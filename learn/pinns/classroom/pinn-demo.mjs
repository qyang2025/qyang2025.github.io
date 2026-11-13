import {mathHtml} from './math.mjs?v=paper20focus1';
import {sentences} from './player.mjs';
let traces;
if(typeof window!=='undefined')fetch('/learn/pinns/classroom/demos/pinns-traces.json').then(r=>r.json()).then(data=>{traces=data;const host=document.querySelector('[data-pinn-demo]');if(host)draw(host,Number(host.dataset.progress||0));});
export function pinnProgress(slide,position,activity={}){
 const lang=activity.language||'en';let prior=0,total=0;
 slide.beats.forEach((b,i)=>{const count=sentences(lang==='en'?(b.textEn||b.text):b.text,lang).length;total+=count;if(i<position.beat)prior+=count;});
 const fraction=activity.duration>0?Math.max(0,Math.min(1,activity.audioTime/activity.duration)):0;
 return Math.max(0,Math.min(1,(prior+position.sentence+fraction)/Math.max(1,total)));
}
export function pinnDemoHtml(slide,en){
 const code=slide.demo==='inverse'?['alpha = softplus(beta) + 1e-6','r = ut - alpha*uxx','loss = (Lr + 10*L0','        + Lb + 10*Ld)','loss.backward(); opt.step()']:slide.demo==='missing-ic'?['u = net(xt)','r = ut - alpha*uxx','loss = residual + boundary',en?'# initial loss is OMITTED':'# 未加入初始损失','loss.backward(); opt.step()']:['u = net(xt)','du = grad(u, xt)','uxx = grad(du[:,0], xt)','r = ut - alpha*uxx','loss.backward(); opt.step()'];
 return `<div class="scene-content inline-python pinn-python" data-pinn-demo="${slide.demo}" data-progress="0"><div class="inline-demo-columns"><div class="pinn-code-panel" data-diagram-node="0"><pre><code>${code.map((line,i)=>`<span data-code-line="${i}">${line.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span>`).join('')}</code></pre><div class="pinn-loss-metrics reveal-pending"></div></div><div data-diagram-node="1" class="inline-demo-chart"><svg viewBox="0 0 440 180" aria-label="${en?'Executed PINN temperature at t=0.5':'已执行 PINN 在零点五时刻的温度'}"></svg><output></output></div></div><div data-formula-step="0" class="board-equation">${mathHtml(slide.formula)}</div></div>`;
}
export function syncPinnDemo(activity,position,slide,language){
 const host=document.querySelector('[data-pinn-demo]');if(!host)return;
 if(activity.audioTime===undefined)return;
 const progress=pinnProgress(slide,position,{...activity,language});host.dataset.progress=String(progress);draw(host,progress);
 const threshold=position.beat===0?Math.min(4,position.sentence+1):4;
 host.querySelector('.pinn-loss-metrics')?.classList.toggle('reveal-pending',position.beat<1);
 host.querySelectorAll('code span').forEach((e,i)=>{e.classList.toggle('reveal-pending',i>threshold);e.classList.toggle('active',i===threshold);});
}
function draw(host,progress){
 if(!traces)return;const run=traces.runs[host.dataset.pinnDemo];if(!run)return;
 const index=Math.min(run.frames.length-1,Math.floor(progress*(run.frames.length-1))),frame=run.frames[index];
 if(host.dataset.epoch===String(frame.epoch))return;
 const points=values=>values.map((u,i)=>`${30+run.x[i]*370},${140-u*100}`).join(' ');
 const en=document.querySelector('#slide').lang==='en';
 host.querySelector('svg').innerHTML=`<path d="M30 15V140H410" fill="none" stroke="#cbd7df" stroke-width="2.25" vector-effect="non-scaling-stroke"/><polyline points="${points(run.truth)}" fill="none" stroke="#79d4ef" stroke-width="3"/><polyline points="${points(frame.curve)}" fill="none" stroke="#ffe071" stroke-width="3"/><foreignObject x="10" y="0" width="35" height="35"><div xmlns="http://www.w3.org/1999/xhtml" class="pinn-axis">${mathHtml('u',false)}</div></foreignObject><foreignObject x="410" y="130" width="30" height="35"><div xmlns="http://www.w3.org/1999/xhtml" class="pinn-axis">${mathHtml('x',false)}</div></foreignObject>`;
 host.querySelector('output').textContent=run.kind==='inverse'?`α=${frame.alpha.toFixed(4)} · ${en?'error':'误差'} ${(frame.relativeL2*100).toFixed(1)}%`:`${en?'Epoch':'迭代'} ${frame.epoch} · ${en?'error':'误差'} ${(frame.relativeL2*100).toFixed(1)}%`;
 const scientific=value=>{const [a,b]=Math.max(1e-16,value).toExponential(1).split('e');return `${a}\\cdot10^{${Number(b)}}`;};
 const entries=[['r',frame.pde],['0',frame.ic],['b',frame.bc],...(run.kind==='inverse'?[['d',frame.data]]:[])];host.querySelector('.pinn-loss-metrics').innerHTML=entries.map(([name,value])=>`<span>${mathHtml(`\\mathcal L_${name}=${scientific(value)}`,false)}</span>`).join('');
 host.dataset.epoch=String(frame.epoch);host.dataset.relativeError=String(frame.relativeL2);host.dataset.alpha=String(frame.alpha);
}
