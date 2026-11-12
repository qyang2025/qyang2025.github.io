import {demoAngle} from './demo-timeline.mjs';
import {mathHtml} from './math.mjs';
let trace;
fetch(new URL('./demos/pca-trace.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Illustration unavailable');return r.json();}).then(t=>{trace=t;draw(0);}).catch(()=>{});
export function inlineDemoHtml(en){
 const t=(a,b)=>en?a:b;
 return `<div class="scene-content inline-python" data-python-demo><div class="inline-demo-columns"><pre data-diagram-node="0"><code><span>Xc = center(X)</span><span>w = direction(theta)</span><span>z = project(Xc, w)</span><span>variance = sample_variance(z)</span></code></pre><div data-diagram-node="1" class="inline-demo-chart"><svg viewBox="0 0 440 240" aria-label="${t('Python projection result','Python 投影结果')}"></svg><output></output></div></div><div data-formula-step="1" class="board-equation">${mathHtml(String.raw`\operatorname{Var}(z)=4\cos^2\theta+\sin^2\theta`)}</div></div>`;
}

export function syncInlineDemo(activity,position){
 if(!document.querySelector('[data-python-demo]')||!Number.isFinite(activity.audioTime))return;
 const progress=activity.duration>0?activity.audioTime/activity.duration:0;
 draw(demoAngle(position.sentence,progress),position.sentence);
}
function draw(angle,sentence=0){
 const host=document.querySelector('[data-python-demo]');if(!host||!trace)return;
 const frame=trace.frames[angle],cx=220,cy=120,k=34;
 let svg='<path d="M35 120H405 M220 10V230" stroke="#52636b"/>';
 svg+=`<line x1="${cx-frame.w[0]*175}" y1="${cy+frame.w[1]*175}" x2="${cx+frame.w[0]*175}" y2="${cy-frame.w[1]*175}" stroke="#ffe071" stroke-width="3"/>`;
 trace.Xc.forEach((p,i)=>{const q=[frame.z[i]*frame.w[0],frame.z[i]*frame.w[1]];svg+=`<path d="M${cx+p[0]*k} ${cy-p[1]*k}L${cx+q[0]*k} ${cy-q[1]*k}" stroke="#79d4ef" opacity=".22"/><circle cx="${cx+p[0]*k}" cy="${cy-p[1]*k}" r="3.5" fill="#79d4ef"/><circle cx="${cx+q[0]*k}" cy="${cy-q[1]*k}" r="3" fill="#ffe071"/>`;});
 host.querySelector('svg').innerHTML=svg;
 host.querySelector('output').textContent=`θ = ${angle}°   ·   ${document.querySelector('#slide').lang==='en'?'Variance':'方差'} = ${frame.variance.toFixed(2)}`;
 host.dataset.angle=String(angle);
 host.querySelectorAll('code span').forEach((e,i)=>e.classList.toggle('active',sentence===0?i===0:sentence===3?i===3:i===1||i===2));
}
